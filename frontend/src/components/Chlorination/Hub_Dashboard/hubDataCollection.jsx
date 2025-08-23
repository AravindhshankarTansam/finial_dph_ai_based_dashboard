import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import DashboardLayout from "./DashboardLayout";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function HubStateData() {
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);

  const [openMap, setOpenMap] = useState(false);
  const [mapCoords, setMapCoords] = useState({ lat: 0, lng: 0 });

  const [openImg, setOpenImg] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [imgMeta, setImgMeta] = useState({
    timestamp: "",
    latitude: "",
    longitude: "",
    hub_name: "",
  });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ppmFilter, setPpmFilter] = useState("");


const getColorBySampling = (value, sampling) => {
  if (sampling === "TAIL" || sampling === "MID") {
    if (value === 0) return "red";
    if (value < 0.2) return "orange";
    return "green";
  } else if (sampling === "OHT" || sampling === "GLR") { 
    if (value === 0) return "red";
    if (value < 1) return "orange";
    return "green";
  }
  return "inherit";
};

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user?.hub_id) {
      toast.error("Hub ID missing. Please log in again.");
      return;
    }

    fetch(`http://localhost:3000/dashboard/chl_datacollection/hubid?hub_id=${user.hub_id}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const result = Array.isArray(data) ? data : data?.data;
        if (Array.isArray(result)) {
          setRows(result);
          setFilteredRows(result); // initial filter
        } else {
          toast.error("Unexpected API response");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Network error");
      });
  }, []);

  // Filter rows based on PPM and Date Range
  useEffect(() => {
    const filtered = rows.filter((row) => {
    const ppm = parseFloat(row.ppm);
    const date = new Date(row.timestamp);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const isWithinRange = (!from || date >= from) && (!to || date <= to);

    const sampling = (row.samplingPoint || "").toUpperCase();
    let ppmStatus = "";
    if (ppm === 0) {
      ppmStatus = "Nil";
    } else if (
      (sampling === "OHT" && ppm >= 1) ||
      ((sampling === "TAIL" || sampling === "MID") && ppm >= 0.2)
    ) {
      ppmStatus = "Adequate";
    } else {
      ppmStatus = "Inadequate";
    }

    const matchesPPM = !ppmFilter || ppmStatus === ppmFilter;
    return isWithinRange && matchesPPM;
  });

  setFilteredRows(filtered);
}, [rows, fromDate, toDate, ppmFilter]); 

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Chlorination Data");

    sheet.columns = [
      { header: "Username", key: "username" },
      { header: "RWAL Name", key: "hub_name" },
      { header: "PPM", key: "ppm" },
      { header: "Sampling Point", key: "samplingPoint" },
      { header: "Timestamp", key: "timestamp" },
      { header: "Latitude", key: "latitude" },
      { header: "Longitude", key: "longitude" },
      { header: "Address", key: "address" },
    ];

    filteredRows.forEach((row) => {
      sheet.addRow({
        username: row.username,
        hub_name: row.hub_name,
        ppm: row.ppm,
        samplingPoint: row.samplingPoint,
        timestamp: row.timestamp,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
      });
    });

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "Regional_chl_data.xlsx");
  };

  const columns = useMemo(() => [
    { field: "id", headerName: "S.No", width: 80 },
    { field: "username", headerName: "Username", width: 140 },
    { field: "hub_name", headerName: "RWAL Name", width: 140 },
    {
      field: "ppm",
      headerName: "Measure PPM",
      width: 120,
      renderCell: (params) => {
        const ppm = parseFloat(params.row.ppm);
        const sampling = (params.row.samplingPoint || "").toUpperCase();
        const color = getColorBySampling(ppm, sampling);
        return (
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Typography sx={{ backgroundColor: color, color: "white", px: 1, py: 0.5, borderRadius: 1, fontWeight: 600 }}>
              {ppm}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "actualPPM",
      headerName: "Actual PPM",
      width: 120,
      renderCell: (params) => {
        const actual = parseFloat(params.row.actualPPM);
        const sampling = (params.row.samplingPoint || "").toUpperCase();
        const color = getColorBySampling(actual, sampling);
        return (
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Typography sx={{ backgroundColor: color, color: "white", px: 1, py: 0.5, borderRadius: 1, fontWeight: 600 }}>
              {actual}
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
    else if (value === "GLR") displayValue = "Ground Level Reservoir"; 
    else if (value === "TAIL") displayValue = "Tailend";
    else if (value === "MID") displayValue = "Midpoint";
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <Typography sx={{ fontWeight: 600 }}>
          {displayValue}
        </Typography>
      </Box>
    );
  },
},
    { field: "timestamp", headerName: "Timestamp", width: 220 },
    { field: "latitude", headerName: "Latitude", width: 120 },
    { field: "longitude", headerName: "Longitude", width: 120 },
    { field: "address", headerName: "Address", width: 170 },
    {
      field: "map",
      headerName: "Map",
      width: 100,
      renderCell: (params) => {
        const { latitude: lat, longitude: lng } = params.row;
        return lat && lng ? (
          <IconButton onClick={() => { setMapCoords({ lat, lng }); setOpenMap(true); }}>
            <VisibilityIcon />
          </IconButton>
        ) : <Typography variant="body2" color="text.secondary">N/A</Typography>;
      },
    },
    {
      field: "images",
      headerName: "Images",
      width: 100,
      renderCell: (params) => {
        const src = params.row.image_path;
        if (!src) return <Typography color="text.secondary">N/A</Typography>;

        const fileName  = src.replace(/\\/g, "/").split("/").pop();
        const fullPath = `http://localhost:3000/${fileName }`;

        return (
          <IconButton onClick={() => {
            setImgSrc(fullPath);
            setImgMeta({
              timestamp: params.row.timestamp,
              latitude: params.row.latitude,
              longitude: params.row.longitude,
              hub_name: params.row.hub_name,
            });
            setOpenImg(true);
          }}>
            <VisibilityIcon />
          </IconButton>
        );
      },
    },
  ], []);

  return (
    <DashboardLayout>
      <Box sx={{ paddingLeft: "60px", paddingTop: "150px" }}>
        <Box p={2}>
          <Typography variant="h5" gutterBottom fontWeight={600}>DATA SET</Typography>

          <Box display="flex" gap={2} mb={2} alignItems="center">
            <TextField
              label="From Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <TextField
              label="To Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
       <FormControl sx={{ minWidth: 150 }}>
        <InputLabel id="ppm-status-label">PPM Status</InputLabel>
        <Select
          labelId="ppm-status-label"
          value={ppmFilter}
          label="PPM Status"
          onChange={(e) => setPpmFilter(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Adequate">Adequate</MenuItem>
          <MenuItem value="Inadequate">Inadequate</MenuItem>
          <MenuItem value="Nil">Nil</MenuItem>
        </Select>
      </FormControl>
          <Button
          variant="contained"
          color="success"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Download Excel
        </Button>
          </Box>

          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            autoHeight
            sx={{
              fontFamily: "Nunito, sans-serif",
              border: "2px solid #2A2F5B",
              borderRadius: 2,
              boxShadow: 2,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#2A2F5B",
                color: "black",
                fontWeight: "bold",
                fontSize: "1rem",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #ddd",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f0f4ff",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
                color: "#333",
              },
            }}
          />
        </Box>

        {/* Map Dialog */}
        <Dialog open={openMap} onClose={() => setOpenMap(false)} maxWidth="md">
          <DialogTitle>
            Location Map
            <IconButton onClick={() => setOpenMap(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
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

        {/* Image Dialog */}
        <Dialog open={openImg} onClose={() => setOpenImg(false)} maxWidth="md">
          <DialogTitle>
            Image Viewer
            <IconButton onClick={() => setOpenImg(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box position="relative">
              <img src={imgSrc} alt="Preview" style={{ maxWidth: "100%", maxHeight: "400px" }} />
              <Box mt={2}>
                <Typography variant="body2"><strong>Timestamp:</strong> {imgMeta.timestamp || "N/A"}</Typography>
                <Typography variant="body2"><strong>Location:</strong> {imgMeta.latitude}, {imgMeta.longitude}</Typography>
                <Typography variant="body2"><strong>Region:</strong> {imgMeta.hub_name || "N/A"}</Typography>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
