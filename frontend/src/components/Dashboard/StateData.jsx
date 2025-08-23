import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import DashboardLayout from "./DashboardLayout";
import {
  Box,
  IconButton,
  Typography,
  MenuItem,
  FormControl,
  Select,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function UserTable() {
  const [filter, setFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [openImg, setOpenImg] = useState(false);
  const [imgSrcs, setImgSrcs] = useState([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [openMap, setOpenMap] = useState(false);
  const [mapCoords, setMapCoords] = useState({ lat: 0, lng: 0 });
  const [districtMaster, setDistrictMaster] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const fetchDistrictMaster = async () => {
      try {
        const resp = await fetch("http://localhost:3000/dashboard/mos-district");
        const data = await resp.json();
        setDistrictMaster(data);
      } catch (e) {
        console.error("Error fetching district master", e);
      }
    };
    fetchDistrictMaster();
  }, []);

  useEffect(() => {
    if (districtMaster.length === 0) return;

    const fetchDashboardData = async () => {
      try {
        const resp = await fetch("http://localhost:3000/dashboard/datacollection");
        if (!resp.ok) {
          console.error("Fetch error", await resp.json());
          return;
        }

        const data = await resp.json();

        const formatted = data.map((d, i) => {
          const userDistrictCode = d.user_id?.substring(0, 7).toUpperCase();

          const matchedDistrict = districtMaster.find((dm) =>
            dm.district_code?.toUpperCase().startsWith(userDistrictCode)
          );

          let userLat = null;
          let userLng = null;
          if (typeof d.user_geolocation === "string" && d.user_geolocation.includes(",")) {
            const [latStr, lngStr] = d.user_geolocation.split(",");
            userLat = parseFloat(latStr.trim());
            userLng = parseFloat(lngStr.trim());
          } else if (
            typeof d.user_geolocation === "object" &&
            d.user_geolocation.latitude &&
            d.user_geolocation.longitude
          ) {
            userLat = d.user_geolocation.latitude;
            userLng = d.user_geolocation.longitude;
          }

          let lat = null;
          let lng = null;
          if (typeof d.geolocation === "object" && d.geolocation !== null) {
            lat = d.geolocation.latitude;
            lng = d.geolocation.longitude;
          }

          return {
            id: i + 1,
            district_name: matchedDistrict?.district_name || "Unknown",
            userId: d.user_id,
            username: d.username,
            userGeo: userLat && userLng ? `Lat: ${userLat}, Lng: ${userLng}` : "N/A",
            date: d.date,
            time: d.time,
            pictures: d.image_base64?.trim()
              ? [`http://localhost:3000${d.image_base64.replace(/\\/g, '/')}`]
              : [],
            geo: lat && lng ? `Lat: ${lat}, Lng: ${lng}` : "N/A",
            lat: lat || 0,
            lng: lng || 0,
            areaType: d.areaType || "",
            address: d.address || "",
          };
        });

        setRows(formatted);
      } catch (e) {
        console.error("Error fetching dashboard data", e);
      }
    };

    fetchDashboardData();
  }, [districtMaster]);

  const filteredRows = rows.filter((row) => {
    const matchesFilter = filter ? row.username.toLowerCase().includes(filter.toLowerCase()) : true;
    const matchesDistrict = districtFilter ? row.district_name === districtFilter : true;
    const matchesArea = areaFilter ? (row.areaType || "").toLowerCase() === areaFilter.toLowerCase() : true;

    const rowDate = new Date(row.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    const matchesDate = (!from || rowDate >= from) && (!to || rowDate <= to);

    return matchesFilter && matchesDistrict && matchesArea && matchesDate;
  });

  const uniqueDistricts = [...new Set(rows.map((row) => row.district_name))];

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Collection");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "District", key: "district_name", width: 20 },
      { header: "Username", key: "username", width: 20 },
      { header: "Area Type", key: "areaType", width: 15 },
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 15 },
      { header: "Geolocation", key: "geo", width: 30 },
      { header: "Address", key: "address", width: 40 },
    ];

    const dataToExport = filteredRows;

    dataToExport.forEach((row) => {
      worksheet.addRow({
        id: row.id,
        district_name: row.district_name,
        username: row.username,
        areaType: row.areaType,
        date: row.date,
        time: row.time,
        geo: row.geo,
        address: row.address,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = districtFilter
      ? `DataCollection_${districtFilter}.xlsx`
      : "DataCollection_AllDistricts.xlsx";

    saveAs(blob, fileName);
  };

  const columns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "district_name", headerName: "District", width: 130 },
    { field: "userId", headerName: "User ID", width: 280 },
    { field: "username", headerName: "UserName", width: 130 },
    { field: "areaType", headerName: "Area Type", width: 120 },
    { field: "date", headerName: "Date", width: 130 },
    { field: "time", headerName: "Time", width: 130 },
    { field: "geo", headerName: "Geolocation", width: 290 },
    { field: "address", headerName: "Address", width: 290 },
    {
      field: "pictures",
      headerName: "Images",
      width: 100,
      renderCell: (params) => (
        <IconButton
          onClick={() => {
            setImgSrcs(params.value || []);
            setImgIndex(0);
            setOpenImg(true);
          }}
        >
          <VisibilityIcon />
        </IconButton>
      ),
    },
    {
      field: "mapView",
      headerName: "Map",
      width: 100,
      renderCell: (params) => (
        <IconButton
          onClick={() => {
            setMapCoords({ lat: params.row.lat, lng: params.row.lng });
            setOpenMap(true);
          }}
        >
          <VisibilityIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Box p={2} sx={{ fontFamily: "Nunito, Poppins, sans-serif", paddingTop: "125px", paddingLeft: "100px" }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: 550, color: "#2A2F5B", fontFamily: "Nunito, sans-serif" }}
        >
          DATA SET (District-Wise Information)
        </Typography>

        <Box display="flex" gap={2} alignItems="center" mb={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 120 }} size="small">
            <Select
              displayEmpty
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              sx={{ fontFamily: "Nunito, sans-serif" }}
            >
              <MenuItem value="">
                <em>All Districts</em>
              </MenuItem>
              {uniqueDistricts.map((district, index) => (
                <MenuItem key={index} value={district} sx={{ fontFamily: "Nunito, sans-serif" }}>
                  {district}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }} size="small">
            <Select
              displayEmpty
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              sx={{ fontFamily: "Nunito, sans-serif" }}
            >
              <MenuItem value="">
                <em>All Areas</em>
              </MenuItem>
              <MenuItem value="Urban">Urban</MenuItem>
              <MenuItem value="Rural">Rural</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            sx={{ fontFamily: "Nunito, sans-serif" }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            sx={{ fontFamily: "Nunito, sans-serif" }}
          />

          <Button
            onClick={downloadExcel}
            variant="contained"
            color="success"
            startIcon={<DownloadForOfflineIcon />}
            sx={{
              fontFamily: "Nunito, sans-serif",
              textTransform: "none",
              fontWeight: 600,
              height: "35px",
            }}
          >
            Download Excel
          </Button>
        </Box>

        <Box style={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={10}
            sx={{
              fontFamily: "Nunito, Poppins, sans-serif",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                fontWeight: 400,
                fontSize: "1.08rem",
                color: "#222",
                fontFamily: "Nunito, sans-serif",
              },
              "& .MuiDataGrid-cell": {
                fontSize: "1.08rem",
                fontWeight: 500,
                color: "#425466",
                fontFamily: "Nunito, sans-serif",
              },
            }}
          />
        </Box>

        {/* Image Dialog */}
        <Dialog open={openImg} onClose={() => setOpenImg(false)} maxWidth="md">
          <DialogTitle sx={{ fontFamily: "Nunito, sans-serif" }}>
            Image Viewer
            <IconButton
              aria-label="close"
              onClick={() => setOpenImg(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {imgSrcs.length > 0 ? (
              <img
                src={imgSrcs[imgIndex]}
                alt={`img-${imgIndex}`}
                style={{ maxWidth: "100%", maxHeight: "70vh" }}
              />
            ) : (
              <Typography sx={{ fontFamily: "Nunito, sans-serif" }}>No Image Available</Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Map Dialog */}
        <Dialog open={openMap} onClose={() => setOpenMap(false)} maxWidth="md">
          <DialogTitle sx={{ fontFamily: "Nunito, sans-serif" }}>
            Location Map
            <IconButton
              aria-label="close"
              onClick={() => setOpenMap(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {mapCoords.lat !== 0 && mapCoords.lng !== 0 ? (
              <iframe
                title="Map View"
                width="100%"
                height="400"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}&z=15&output=embed`}
              ></iframe>
            ) : (
              <Typography sx={{ fontFamily: "Nunito, sans-serif" }}>Invalid Coordinates</Typography>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
