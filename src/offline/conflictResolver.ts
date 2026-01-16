import type {
  LocalShoppingList,
  LocalShoppingListItem,
  ShoppingList,
  ShoppingListItem,
} from "@/types/shoppingList";

export type ConflictStrategy = "server-wins" | "client-wins" | "merge";

export interface ConflictResolution<T> {
  resolved: T;
  strategy: ConflictStrategy;
  hadConflict: boolean;
}

// Resolve list conflicts between local and server versions
export function resolveListConflict(
  local: LocalShoppingList,
  server: ShoppingList,
  strategy: ConflictStrategy = "server-wins"
): ConflictResolution<LocalShoppingList> {
  // Check if there's an actual conflict
  const localUpdated = new Date(local.updatedAt).getTime();
  const serverUpdated = new Date(server.updatedAt).getTime();

  // No conflict if server is newer and local hasn't been modified
  if (local.syncStatus === "synced" || serverUpdated > localUpdated) {
    return {
      resolved: {
        ...local,
        ...server,
        localId: local.localId,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      },
      strategy: "server-wins",
      hadConflict: false,
    };
  }

  // There's a conflict
  switch (strategy) {
    case "server-wins":
      return {
        resolved: {
          ...local,
          ...server,
          localId: local.localId,
          syncStatus: "synced",
          lastSyncedAt: new Date().toISOString(),
        },
        strategy,
        hadConflict: true,
      };

    case "client-wins":
      return {
        resolved: {
          ...local,
          syncStatus: "pending", // Will sync back to server
        },
        strategy,
        hadConflict: true,
      };

    case "merge":
      // Merge strategy: use server for most fields, but preserve local changes
      return {
        resolved: {
          ...server,
          localId: local.localId,
          // Use local name if changed more recently
          name: localUpdated > serverUpdated ? local.name : server.name,
          syncStatus: localUpdated > serverUpdated ? "pending" : "synced",
          lastSyncedAt: new Date().toISOString(),
        },
        strategy,
        hadConflict: true,
      };
  }
}

// Resolve item conflicts between local and server versions
export function resolveItemConflict(
  local: LocalShoppingListItem,
  server: ShoppingListItem,
  strategy: ConflictStrategy = "server-wins"
): ConflictResolution<LocalShoppingListItem> {
  // For items, the most important field to resolve is isChecked
  const localCheckedAt = local.checkedAt ? new Date(local.checkedAt).getTime() : 0;
  const serverCheckedAt = server.checkedAt ? new Date(server.checkedAt).getTime() : 0;

  // No conflict if server is newer
  if (local.syncStatus === "synced") {
    return {
      resolved: {
        ...local,
        ...server,
        localId: local.localId,
        localListId: local.localListId,
        syncStatus: "synced",
      },
      strategy: "server-wins",
      hadConflict: false,
    };
  }

  switch (strategy) {
    case "server-wins":
      return {
        resolved: {
          ...local,
          ...server,
          localId: local.localId,
          localListId: local.localListId,
          syncStatus: "synced",
        },
        strategy,
        hadConflict: true,
      };

    case "client-wins":
      return {
        resolved: {
          ...local,
          syncStatus: "pending",
        },
        strategy,
        hadConflict: true,
      };

    case "merge":
      // For checked status, prefer the most recent toggle
      const useLocalChecked = localCheckedAt > serverCheckedAt;
      return {
        resolved: {
          ...server,
          localId: local.localId,
          localListId: local.localListId,
          isChecked: useLocalChecked ? local.isChecked : server.isChecked,
          checkedAt: useLocalChecked ? local.checkedAt : server.checkedAt,
          quantity: local.quantity ?? server.quantity, // Prefer local quantity if set
          syncStatus: useLocalChecked ? "pending" : "synced",
        },
        strategy,
        hadConflict: true,
      };
  }
}

// Batch resolve lists
export function resolveLists(
  localLists: LocalShoppingList[],
  serverLists: ShoppingList[],
  strategy: ConflictStrategy = "server-wins"
): LocalShoppingList[] {
  const serverMap = new Map(serverLists.map((s) => [s.id, s]));
  const localById = new Map(
    localLists.filter((l) => l.id).map((l) => [l.id, l])
  );

  const resolved: LocalShoppingList[] = [];

  // Process server lists
  for (const serverList of serverLists) {
    const local = localById.get(serverList.id);

    if (local) {
      const resolution = resolveListConflict(local, serverList, strategy);
      resolved.push(resolution.resolved);
    } else {
      // New from server
      resolved.push({
        ...serverList,
        localId: `server_${serverList.id}`,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
      });
    }
  }

  // Add local-only lists (not yet synced)
  for (const local of localLists) {
    if (!local.id && local.syncStatus === "pending") {
      resolved.push(local);
    }
  }

  return resolved;
}

// Batch resolve items
export function resolveItems(
  localItems: LocalShoppingListItem[],
  serverItems: ShoppingListItem[],
  localListId: string,
  strategy: ConflictStrategy = "server-wins"
): LocalShoppingListItem[] {
  const serverMap = new Map(serverItems.map((s) => [s.id, s]));
  const localById = new Map(
    localItems.filter((l) => l.id).map((l) => [l.id, l])
  );

  const resolved: LocalShoppingListItem[] = [];

  // Process server items
  for (const serverItem of serverItems) {
    const local = localById.get(serverItem.id);

    if (local) {
      const resolution = resolveItemConflict(local, serverItem, strategy);
      resolved.push(resolution.resolved);
    } else {
      // New from server
      resolved.push({
        ...serverItem,
        localId: `server_${serverItem.id}`,
        localListId,
        syncStatus: "synced",
      });
    }
  }

  // Add local-only items (not yet synced)
  for (const local of localItems) {
    if (!local.id && local.syncStatus === "pending") {
      resolved.push(local);
    }
  }

  return resolved;
}

// Detect conflicts without resolving
export function detectConflicts(
  localLists: LocalShoppingList[],
  serverLists: ShoppingList[]
): { listId: number; localUpdated: Date; serverUpdated: Date }[] {
  const conflicts: { listId: number; localUpdated: Date; serverUpdated: Date }[] = [];
  const serverMap = new Map(serverLists.map((s) => [s.id, s]));

  for (const local of localLists) {
    if (local.id && local.syncStatus === "pending") {
      const server = serverMap.get(local.id);
      if (server) {
        const localTime = new Date(local.updatedAt);
        const serverTime = new Date(server.updatedAt);

        if (serverTime > localTime) {
          conflicts.push({
            listId: local.id,
            localUpdated: localTime,
            serverUpdated: serverTime,
          });
        }
      }
    }
  }

  return conflicts;
}
