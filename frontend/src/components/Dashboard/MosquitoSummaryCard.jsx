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
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryIcon from "@mui/icons-material/History";

const MosquitoSummaryCard = () => {
  const [dataCollection, setDataCollection] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/datacollection");
      const json = await res.json();
      setDataCollection(json || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to parse date from "YYYY-MM-DD" or "DD-MM-YYYY"
  const parseDate = (rawDate) => {
    if (!rawDate) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      // Format: yyyy-mm-dd
      return new Date(rawDate);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      // Format: dd-mm-yyyy
      const [day, month, year] = rawDate.split("-");
      return new Date(`${year}-${month}-${day}`);
    }

    return null;
  };

  const getTodayCount = () => {
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    return dataCollection.filter((row) => {
      const parsed = parseDate(row.date);
      return parsed && parsed.toISOString().slice(0, 10) === today;
    }).length;
  };

  const getThisMonthCount = () => {
    const thisMonth = new Date().toISOString().slice(0, 7); // yyyy-mm
    return dataCollection.filter((row) => {
      const parsed = parseDate(row.date);
      return parsed && parsed.toISOString().slice(0, 7) === thisMonth;
    }).length;
  };

  const getPreviousMonthCount = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const prevMonth = now.toISOString().slice(0, 7); // yyyy-mm
    return dataCollection.filter((row) => {
      const parsed = parseDate(row.date);
      return parsed && parsed.toISOString().slice(0, 7) === prevMonth;
    }).length;
  };

  const summaryItems = [
    {
      title: "Total Regional Data",
      value: dataCollection.length,
      icon: <FormatListNumberedIcon sx={{ fontSize: 50, color: "#455A64" }} />,
    },
    {
      title: "Today's Regional Data",
      value: getTodayCount(),
      icon: <TodayIcon sx={{ fontSize: 50, color: "#2E7D32" }} />,
    },
    {
      title: "This Month's Regional Data",
      value: getThisMonthCount(),
      icon: <CalendarMonthIcon sx={{ fontSize: 50, color: "#0277BD" }} />,
    },
    {
      title: "Previous Month's Regional Data",
      value: getPreviousMonthCount(),
      icon: <HistoryIcon sx={{ fontSize: 50, color: "#FF6F00" }} />,
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
            <Grid item xs={12} sm={6} md={4} lg={3} key={index} sx={{ display: "flex" }}>
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

export default MosquitoSummaryCard;
