import React, { useEffect, useState } from "react";
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  Button,
  TextField,
} from "@mui/material";
import DashboardLayout from "./DashboardLayout";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function BlkHudStateData() {
  const [rows, setRows] = useState([]);
  const [blockList, setBlockList] = useState([]);
  const [blockFilter, setBlockFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openMap, setOpenMap] = useState(false);
  const [mapCoords, setMapCoords] = useState({ lat: 0, lng: 0 });
  const [openImg, setOpenImg] = useState(false);
  const [imgSrcs, setImgSrcs] = useState([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [userBlockId, setUserBlockId] = useState(null); // ✅ store logged-in user's block_id

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/dashboard/chl_hud_datacollection");
        const result = await res.json();

        if (Array.isArray(result)) {
          const formatted = result.map((item, index) => ({
            id: index + 1,
            ...item,
          }));
          setRows(formatted);
        } else {
          console.error("Invalid data format:", result);
        }
      } catch (err) {
        console.error("Failed to fetch chlorine data:", err);
      }
    };

    const fetchBlockList = async () => {
      try {
        const res = await fetch("http://localhost:3000/dashboard/hud-blocks");
        const result = await res.json();
        if (Array.isArray(result)) {
          setBlockList(result);
        }
      } catch (err) {
        console.error("Failed to fetch Block list:", err);
      }
    };

    fetchData();
    fetchBlockList();
  }, []);

  // ✅ Fetch logged-in user's block
  useEffect(() => {
    const fetchUserBlock = async () => {
      const username = localStorage.getItem("loggedInUsername");
      if (!username) return;

      try {
        const res = await fetch("http://localhost:3000/dashboard/block-users");
        const users = await res.json();
        const loggedInUser = users.find((u) => u.username === username);

        if (loggedInUser) {
          setUserBlockId(loggedInUser.block_id);
          setBlockFilter(loggedInUser.block_id); // ✅ default filter to user's block
        }
      } catch (err) {
        console.error("Error fetching logged-in user block:", err);
      }
    };
    fetchUserBlock();
  }, []);

  // Helper: check if a date is within range
  const isDateInRange = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (fromDate && date < new Date(fromDate)) return false;
    if (toDate && date > new Date(toDate)) return false;
    return true;
  };

  // ✅ Filter by userBlock + blockFilter + date
  const filteredRows = rows.filter((row) => {
    if (userBlockId && row.block_id !== userBlockId) return false; // restrict to logged-in block
    if (blockFilter && row.block_id !== blockFilter) return false;
    if (fromDate || toDate) {
      return isDateInRange(row.timestamp);
    }
    return true;
  });

  const getColorBySampling = (value, sampling) => {
    if (sampling === "TAIL" || sampling === "MID") {
      if (value === 0) return "red";
      if (value < 0.2) return "orange";
      return "green";
    } else if (sampling === "OHT" || sampling === "GLR") { // <-- add GLR here
      if (value === 0) return "red";
      if (value < 1) return "orange";
      return "green";
    }
    return "inherit";
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Chlorine Data");

    worksheet.columns = [
      { header: "S.No", key: "id", width: 10 },
      { header: "Username", key: "username", width: 20 },
      { header: "Block Name", key: "block_name", width: 20 },
      { header: "Address", key: "address", width: 20 },
      { header: "Measure PPM", key: "ppm", width: 15 },
      { header: "Sampling Point", key: "samplingPoint", width: 20 },
      { header: "Timestamp", key: "timestamp", width: 25 },
      { header: "Latitude", key: "latitude", width: 15 },
      { header: "Longitude", key: "longitude", width: 15 },
    ];

    filteredRows.forEach((row) => {
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "Block_datacollection.xlsx");
  };

  const columns = [
    { field: "id", headerName: "S.No", width: 80 },
    { field: "username", headerName: "Username", width: 140 },
    { field: "block_name", headerName: "Block Name", width: 140 },
    { field: "address", headerName: "Address", width: 190 },
    {
      field: "actualPPM",
      headerName: "Actual PPM",
      width: 150,
      renderCell: (params) => {
        const actual = parseFloat(params.row.actualPPM);
        const sampling = (params.row.samplingPoint || "").toUpperCase();
        const color = getColorBySampling(actual, sampling);
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <Typography
              sx={{
                backgroundColor: color,
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                fontFamily: "Nunito, sans-serif",
              }}
            >
              {actual}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "ppm",
      headerName: "Measure PPM",
      width: 170,
      renderCell: (params) => {
        const ppm = parseFloat(params.row.ppm);
        const sampling = (params.row.samplingPoint || "").toUpperCase();
        const color = getColorBySampling(ppm, sampling);
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <Typography
              sx={{
                backgroundColor: color,
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                fontFamily: "Nunito, sans-serif",
              }}
            >
              {ppm}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "samplingPoint",
      headerName: "Sampling Point",
      width: 180,
      renderCell: (params) => {
        const value = (params.row.samplingPoint || "").toUpperCase();
        let displayValue = value;
        if (value === "OHT") displayValue = "Over head Tank";
        else if (value === "GLR") displayValue = "Ground Level Reservoir"; // <-- add this
        else if (value === "TAIL") displayValue = "Tailend";
        else if (value === "MID") displayValue = "Midpoint";
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <Typography sx={{ fontWeight: 600 }}>{displayValue}</Typography>
          </Box>
        );
      },
    },
    { field: "timestamp", headerName: "Date", width: 200 },
    { field: "latitude", headerName: "Latitude", width: 120 },
    { field: "longitude", headerName: "Longitude", width: 150 },
    {
      field: "map",
      headerName: "Map",
      width: 100,
      renderCell: (params) => {
        const lat = params.row.latitude;
        const lng = params.row.longitude;
        const valid = lat != null && lng != null;
        return valid ? (
          <IconButton
            onClick={() => {
              setMapCoords({ lat, lng });
              setOpenMap(true);
            }}
          >
            <VisibilityIcon />
          </IconButton>
        ) : (
          <Typography variant="body2" color="text.secondary">
            N/A
          </Typography>
        );
      },
    },
    {
      field: "images",
      headerName: "Image",
      width: 100,
      renderCell: (params) => {
        const imagePath = params.row.image_path;
        if (!imagePath || !imagePath.includes("chlorine_image_")) {
          return <Typography variant="body2" color="text.secondary">N/A</Typography>;
        }

        const imageUrl = `http://localhost:3000${imagePath}`;

        return (
          <IconButton
            onClick={() => {
              setImgSrcs([imageUrl]);
              setImgIndex(0);
              setOpenImg(true);
            }}
          >
            <VisibilityIcon />
          </IconButton>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <Box p={2} sx={{ paddingTop: 20, paddingLeft: 10 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, fontFamily: "Nunito, sans-serif" }}>
          DATA SET
        </Typography>

        {/* Filters + Download */}
        <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 200 }} size="small">
            <Select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              disabled // ✅ prevents user from changing block
            >
              {blockList
                .filter((block) => block.block_id === userBlockId) // ✅ only show logged-in user's block
                .map((block) => (
                  <MenuItem key={block.block_id} value={block.block_id}>
                    {block.block_name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            sx={{ minWidth: 140 }}
          />

          <TextField
            label="To Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            sx={{ minWidth: 140 }}
          />

          <Button
            onClick={handleDownloadExcel}
            variant="contained"
            color="success"
            startIcon={<DownloadForOfflineIcon />}
            sx={{ fontFamily: "Nunito, sans-serif", textTransform: "none" }}
          >
            Download as Excel
          </Button>
        </Box>

        <Box style={{ height: "auto", minHeight: 600, width: "100%" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={20}
            rowsPerPageOptions={[20]}
            sx={{
              fontFamily: "Nunito, sans-serif",
              border: "2px solid #2A2F5B",
              borderRadius: 2,
              boxShadow: 2,
              "& .MuiDataGrid-columnHeaders": {
                color: "black",
                fontWeight: 900,
                fontSize: "1.1rem",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                borderBottom: "3px solid black",
                background: "transparent",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #ddd",
                fontSize: "0.95rem",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f0f4ff",
              },
              "& .MuiDataGrid-footerContainer": {
                backgroundColor: "#f9f9f9",
              },
            }}
          />
        </Box>

        {/* Map Dialog */}
        <Dialog open={openMap} onClose={() => setOpenMap(false)} maxWidth="md">
          <DialogTitle sx={{ fontFamily: "Nunito, sans-serif" }}>
            Location Map
            <IconButton aria-label="close" onClick={() => setOpenMap(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <iframe
              title="Map"
              width="100%"
              height="400"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://maps.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=15&output=embed`}
              allowFullScreen
            ></iframe>
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog open={openImg} onClose={() => setOpenImg(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontFamily: "Nunito, sans-serif" }}>
            Image Viewer
            <IconButton aria-label="close" onClick={() => setOpenImg(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 2, backgroundColor: "#f5f5f5" }}>
            {imgSrcs.length > 0 ? (
              <Box sx={{ backgroundColor: "#fff", borderRadius: 2, boxShadow: 2 }}>
                <Box
                  sx={{
                    width: "100%",
                    height: "45vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#000",
                  }}
                >
                  <img
                    src={imgSrcs[imgIndex]}
                    alt={`img-${imgIndex}`}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </Box>
              </Box>
            ) : (
              <Typography sx={{ fontFamily: "Nunito, sans-serif" }}>No Image Available</Typography>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
