import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Menu,
  TextField,
} from "@mui/material";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import DownloadIcon from "@mui/icons-material/Download";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const COLOR_MAP = {
  green: "#43a047",
  red: "#e53935",
  orange: "#fb8c00",
};

const getColorBySampling = (value, sampling) => {
  if (sampling === "TAIL" || sampling === "MID") {
    if (value === 0) return "red";
    if (value < 0.2) return "orange";
    return "green";
  } else if (sampling === "OHT") {
    if (value === 0) return "red";
    if (value < 1) return "orange";
    return "green";
  }
  return "inherit";
};

function exportToCSV(data, filename = "data.csv") {
  if (!data.length) return;
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    });
    csvRows.push(values.join(","));
  }
  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function exportToExcel(data, filename = "data.xlsx") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

function exportToPDF(data, filename = "data.pdf") {
  const doc = new jsPDF();
  const headers = Object.keys(data[0] || {});
  let y = 10;
  doc.setFontSize(10);
  doc.text(headers.join(" | "), 10, y);
  y += 8;
  data.forEach(row => {
    const rowString = headers.map(h => row[h]).join(" | ");
    doc.text(rowString, 10, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });
  doc.save(filename);
}

function exportToDoc(data, filename = "data.doc") {
  const headers = Object.keys(data[0] || {});
  let docContent = headers.join("\t") + "\n";
  data.forEach(row => {
    docContent += headers.map(h => row[h]).join("\t") + "\n";
  });
  const blob = new Blob([docContent], { type: "application/msword" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function DataCollectionChart({ rows }) {
  const [selectedHub, setSelectedHub] = useState("All");
  const [ppmFilter, setPpmFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const downloadMenuOpen = Boolean(anchorEl);

  const hubs = useMemo(() => {
    const allHubs = rows.map((row) => row.hub_name || "Unknown");
    const unique = Array.from(new Set(allHubs));
    return ["All", ...unique];
  }, [rows]);

  const ppmCounts = useMemo(() => {
    const counts = { green: 0, orange: 0, red: 0 };
    rows.forEach((row) => {
      const sampling = (row.samplingPoint || "").toUpperCase();
      const ppm = parseFloat(row.ppm);
      const color = getColorBySampling(ppm, sampling);
      if (counts[color] !== undefined) {
        counts[color]++;
      }
    });
    return counts;
  }, [rows]);

  const isWithinDateRange = (timestamp) => {
    if (!fromDate && !toDate) return true;
    const rowDate = new Date(timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, "$3-$2-$1T").replace(" ", " "));
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from && to) return rowDate >= from && rowDate <= to;
    if (from) return rowDate >= from;
    if (to) return rowDate <= to;
    return true;
  };

  const filteredRows = useMemo(() => {
    let result = [...rows];
    if (selectedHub !== "All") {
      result = result.filter((row) => row.hub_name === selectedHub);
    }
    if (ppmFilter !== "All") {
      result = result.filter((row) => {
        const sampling = (row.samplingPoint || "").toUpperCase();
        const ppm = parseFloat(row.ppm);
        const color = getColorBySampling(ppm, sampling);
        if (ppmFilter === "Adequate") return color === "green";
        if (ppmFilter === "Inadequate") return color === "orange";
        if (ppmFilter === "Nil") return color === "red";
        return true;
      });
    }
    result = result.filter((row) => isWithinDateRange(row.timestamp));
    return result;
  }, [rows, selectedHub, ppmFilter, fromDate, toDate]);

  const chartData = useMemo(() => {
    const counts = { green: 0, red: 0, orange: 0 };
    filteredRows.forEach((row) => {
      const sampling = (row.samplingPoint || "").toUpperCase();
      const ppm = parseFloat(row.ppm);
      const color = getColorBySampling(ppm, sampling);
      if (counts[color] !== undefined) {
        counts[color]++;
      }
    });
    return Object.entries(counts).map(([color, count]) => ({
      name: color.charAt(0).toUpperCase() + color.slice(1),
      value: count,
      color: COLOR_MAP[color] || color,
    }));
  }, [filteredRows]);

  const handleDownload = (format) => {
    try {
      setAnchorEl(null);
      if (!filteredRows.length) {
        alert("No data to download for the selected filters.");
        return;
      }
      const transformedData = filteredRows.map((row) => {
        const newRow = { ...row };
        newRow.Region_name = newRow.hub_name || "Unknown";
        delete newRow.hub_name;
        delete newRow.user_id;
        delete newRow.hub_id;
        delete newRow.actualPPM;
        delete newRow.image_path;
        delete newRow.color_actual;
        if (newRow.timestamp) {
          newRow.Date = new Date(newRow.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, "$3-$2-$1T").replace(" ", " ")).toISOString().split("T")[0];
          delete newRow.timestamp;
        }
        return newRow;
      });

      switch (format) {
        case "csv":
          exportToCSV(transformedData, "Chlorination_data.csv");
          break;
        case "excel":
          exportToExcel(transformedData, "Chlorination_data.xlsx");
          break;
        case "pdf":
          exportToPDF(transformedData, "Chlorination_data.pdf");
          break;
        case "doc":
          exportToDoc(transformedData, "Chlorination_data.doc");
          break;
        default:
          alert("Unknown format");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("An error occurred during export.");
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{ 
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        ml: { md: '65px' }, // 👈 Add this line
        borderRadius: 4,
        p: { xs: 2, sm: 4 },
        background: "#f9fbfd",
        boxShadow: "0 4px 24px 0 rgba(33,150,243,0.08)",
        mb: 4,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ color: "#222", fontWeight: 700 }}>
          PPM Status Distribution (Counts)
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 160, background: "#fff", borderRadius: 2 }} size="small">
            <InputLabel>Select Hub</InputLabel>
            <Select value={selectedHub} onChange={(e) => setSelectedHub(e.target.value)} label="Select Hub">
              {hubs.map((hub) => (
                <MenuItem key={hub} value={hub}>{hub}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180, background: "#fff", borderRadius: 2 }} size="small">
            <InputLabel>PPM Status</InputLabel>
            <Select value={ppmFilter} onChange={(e) => setPpmFilter(e.target.value)} label="PPM Status">
              <MenuItem value="All">All ({rows.length})</MenuItem>
              <MenuItem value="Adequate">Adequate (Green) ({ppmCounts.green})</MenuItem>
              <MenuItem value="Inadequate">Inadequate (Orange) ({ppmCounts.orange})</MenuItem>
              <MenuItem value="Nil">Nil (Red) ({ppmCounts.red})</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ background: "#fff", borderRadius: 2, minWidth: 140 }}
          />
          <TextField
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ background: "#fff", borderRadius: 2, minWidth: 140 }}
          />

          <Tooltip title="Download Data">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ background: "#fff", border: "1px solid #b3c6e0" }}>
              <DownloadIcon color="primary" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={downloadMenuOpen}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={() => handleDownload("csv")}>Download as CSV</MenuItem>
            <MenuItem onClick={() => handleDownload("excel")}>Download as Excel</MenuItem>
            <MenuItem onClick={() => handleDownload("pdf")}>Download as PDF</MenuItem>
            <MenuItem onClick={() => handleDownload("doc")}>Download as DOC</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ width: "100%", height: 320, background: "#f5f7fa", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <ReTooltip />
              <Legend />
              <Bar dataKey="value" barSize={50}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            No data available for this filter.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}