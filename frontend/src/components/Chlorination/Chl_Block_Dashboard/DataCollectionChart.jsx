import React, { useMemo, useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
import DownloadIcon from "@mui/icons-material/Download";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Custom color palette
const COLOR_MAP = {
  Adequate: "#43a047", // Green
  Nil: "#e53935", // Red
  Inadequate: "#fb8c00", // Orange
};

// CSV export utility
function exportToCSV(data, filename = "data.csv") {
  if (!data.length) return;
  const csvRows = [];
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map((header) => {
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

// Excel export utility
function exportToExcel(data, filename = "data.xlsx") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// PDF export utility
function exportToPDF(data, filename = "data.pdf") {
  const doc = new jsPDF();
  const headers = Object.keys(data[0] || {});
  let y = 10;
  doc.setFontSize(10);
  doc.text(headers.join(" | "), 10, y);
  y += 8;
  data.forEach((row) => {
    const rowString = headers.map((h) => row[h]).join(" | ");
    doc.text(rowString, 10, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });
  doc.save(filename);
}

// DOC export utility
function exportToDoc(data, filename = "data.doc") {
  const headers = Object.keys(data[0] || {});
  let docContent = headers.join("\t") + "\n";
  data.forEach((row) => {
    docContent += headers.map((h) => row[h]).join("\t") + "\n";
  });
  const blob = new Blob([docContent], { type: "application/msword" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function DataCollectionChart() {
  const [rows, setRows] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState("All");
  const [anchorEl, setAnchorEl] = useState(null);
  const downloadMenuOpen = Boolean(anchorEl);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataRes, blockRes] = await Promise.all([
          fetch("http://localhost:3000/dashboard/chl_hud_datacollection"),
          fetch("http://localhost:3000/dashboard/hud-blocks"),
        ]);
        const data = await dataRes.json();
        const blocksData = await blockRes.json();
        setRows(data);
        setBlocks(blocksData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Extract unique block names
  const blockNames = useMemo(() => {
    const unique = Array.from(new Set(blocks.map((b) => b.block_name || "Unknown")));
    return ["All", ...unique];
  }, [blocks]);

  // Filter rows by block_name
  const filteredRows = useMemo(() => {
    if (selectedBlock === "All") return rows;
    return rows.filter((row) => row.block_name === selectedBlock);
  }, [rows, selectedBlock]);

  // Generate chart data (map backend values to Adequate/Inadequate/Nil)
  const chartData = useMemo(() => {
    const counts = { Adequate: 0, Inadequate: 0, Nil: 0 };

    filteredRows.forEach((row) => {
      const color = (row.color_ppm || "").toLowerCase();
      if (color === "green") counts.Adequate++;
      if (color === "red") counts.Nil++;
      if (color === "orange") counts.Inadequate++;
    });

    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
    if (total === 0) return [];

    return Object.entries(counts).map(([key, count]) => ({
      name: key,
      value: parseFloat(((count / total) * 100).toFixed(2)),
      color: COLOR_MAP[key],
    }));
  }, [filteredRows]);

  // Download handler
  const handleDownload = (format) => {
    setAnchorEl(null);
    if (!filteredRows.length) {
      alert("No data to download for the selected block.");
      return;
    }
    switch (format) {
      case "csv":
        exportToCSV(filteredRows, "block_data.csv");
        break;
      case "excel":
        exportToExcel(filteredRows, "block_data.xlsx");
        break;
      case "pdf":
        exportToPDF(filteredRows, "block_data.pdf");
        break;
      case "doc":
        exportToDoc(filteredRows, "block_data.doc");
        break;
      default:
        alert("Unknown format");
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        borderRadius: 4,
        p: { xs: 2, sm: 4 },
        background: "#f9fbfd",
        boxShadow: "0 4px 24px 0 rgba(33,150,243,0.08)",
        mb: 4,
      }}
    >
      {/* Header and Filter Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "#222",
            fontFamily: "Nunito, sans-serif",
            fontWeight: 700,
            letterSpacing: 0.5,
            mr: 2,
          }}
        >
          PPM Status Distribution (%)
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FormControl
            sx={{
              minWidth: 120,
              maxWidth: 160,
              background: "#fff",
              borderRadius: 2,
              boxShadow: "0 1px 4px 0 rgba(33,150,243,0.04)",
            }}
            size="small"
          >
            <InputLabel>Select Block</InputLabel>
            <Select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              label="Select Block"
            >
              {blockNames.map((block) => (
                <MenuItem key={block} value={block}>
                  {block}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Download Button with Dropdown */}
          <Tooltip title="Download Data">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 1, background: "#fff", border: "1px solid #b3c6e0" }}
            >
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

      {/* Pie Chart */}
      <Box
        sx={{
          width: "100%",
          height: 320,
          background: "#f5f7fa",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ReTooltip />
              <Legend
                iconType="circle"
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontWeight: 600 }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
            No data available for this block.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
