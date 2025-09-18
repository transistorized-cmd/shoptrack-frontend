export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportData {
  title: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export interface ReportRequest {
  pluginKey: string;
  dateRange?: DateRange;
  parameters: Record<string, any>;
}
