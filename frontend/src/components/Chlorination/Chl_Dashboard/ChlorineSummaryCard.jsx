import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  Grid,
} from "@mui/material";
import TodayIcon from "@mui/icons-material/Today";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import DomainIcon from "@mui/icons-material/Domain";
import HomeWorkIcon from "@mui/icons-material/HomeWork";

const ChlorineSummaryCard = () => {
  const [chlData, setChlData] = useState([]);
  const [villageData, setVillageData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [chlRes, villageRes] = await Promise.all([
        fetch("http://localhost:3000/dashboard/chl_datacollection"),
        fetch("http://localhost:3000/dashboard/village"),
      ]);

      const chlJson = await chlRes.json();
      const villageJson = await villageRes.json();

      setChlData(chlJson || []);
      setVillageData(villageJson || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTodayCount = () => {
    const today = new Date().toISOString().slice(0, 10);
    return chlData.filter(
      (row) => row.timestamp && row.timestamp.startsWith(today)
    ).length;
  };

  const hudCount = new Set(villageData.map((v) => v.hud_id)).size;
  const blockCount = new Set(villageData.map((v) => v.block_id)).size;
  const villageCount = villageData.length;

  const summaryItems = [
    {
      title: "Total Regional Data",
      value: chlData.length,
      icon: <FormatListNumberedIcon sx={{ fontSize: 50, color: "#455A64" }} />,
    },
    {
      title: "Today's Regional Data",
      value: getTodayCount(),
      icon: <TodayIcon sx={{ fontSize: 50, color: "#2E7D32" }} />,
    },
    {
      title: "HUD Count",
      value: hudCount,
      icon: <DomainIcon sx={{ fontSize: 50, color: "#5C6BC0" }} />,
    },
    {
      title: "Block Count",
      value: blockCount,
      icon: <LocationCityIcon sx={{ fontSize: 50, color: "#00838F" }} />,
    },
    {
      title: "Village Count",
      value: villageCount,
      icon: <HomeWorkIcon sx={{ fontSize: 50, color: "#6D4C41" }} />,
    },
  ];

  return (
    <Box sx={{ mt: 2, px: 2 }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 150 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {summaryItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: "flex" }}>
              <Card
                elevation={4}
                sx={{
                  flex: 1,
                  backgroundColor: "#ffffff",
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  px: 3,
                  py: 3,
                  gap: 3,
                  minHeight: 150,
                  height: "100%",
                  boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)",
                  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    transform: "scale(1.01)",
                    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Box>{item.icon}</Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#616161",
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      color: "#2E3B55",
                      fontWeight: 700,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ChlorineSummaryCard;
