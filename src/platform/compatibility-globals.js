import * as React from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import PropTypes from "prop-types";
import * as ReactIs from "react-is";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

const Recharts = {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
};

export function installCompatibilityGlobals() {
  window.React = React;
  window.ReactDOM = { createRoot, createPortal };
  window.PropTypes = PropTypes;
  window.ReactIs = ReactIs;
  window.Recharts = Recharts;
}
