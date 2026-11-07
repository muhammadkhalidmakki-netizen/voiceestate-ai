// Client-only ECharts setup. Only the chart types this planner uses are
// registered, so the bundle stays small. Loaded with a dynamic import.
import * as echarts from "echarts/core";
import { BarChart, FunnelChart, HeatmapChart, LineChart, MapChart, PieChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GeoComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  FunnelChart,
  HeatmapChart,
  LineChart,
  MapChart,
  PieChart,
  ScatterChart,
  AriaComponent,
  GeoComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapComponent,
  UniversalTransition,
  CanvasRenderer,
]);

export { echarts };
