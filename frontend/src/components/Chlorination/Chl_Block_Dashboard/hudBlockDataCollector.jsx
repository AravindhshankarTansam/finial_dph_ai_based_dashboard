import React, { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function BlkVillageOfficerView() {
  const [user, setUser] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [officers, setOfficers] = useState([]);

  // Fetch logged-in user's info (including hud_id)
  useEffect(() => {
    const fetchLoggedInUser = async () => {
      const username = localStorage.getItem("loggedInUsername");
      if (!username) return;
      try {
        const res = await fetch("http://localhost:3000/dashboard/block-users");
        const data = await res.json();
        const matched = data.find((u) => u.username === username);
        setUser(matched || null);
      } catch (err) {
        console.error("Error fetching HUD master users:", err);
      }
    };
    fetchLoggedInUser();
  }, []);

  // Fetch blocks for logged-in user's hud_id
  useEffect(() => {
    if (user?.hud_id) {
      fetchBlocks();
    }
  }, [user]);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/hud-blocks");
      if (!res.ok) throw new Error("Failed to fetch blocks");
      const data = await res.json();
      const filteredBlocks = data.filter((b) => b.hud_id === user.hud_id);
      setBlocks(filteredBlocks);
    } catch (err) {
      console.error(err);
      setBlocks([]);
    }
  };

  // Fetch officers filtered by the logged-in user's blocks
  useEffect(() => {
    if (blocks.length > 0) {
      fetchOfficers();
    }
  }, [blocks]);

  const fetchOfficers = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/village-user");
      if (!res.ok) throw new Error("Failed to fetch officers");
      const data = await res.json();

      const userBlockIds = blocks.map((b) => b.block_id);
      const filteredOfficers = data.filter((officer) =>
        userBlockIds.includes(officer.block_id)
      );

      setOfficers(filteredOfficers);
    } catch (err) {
      console.error(err);
      setOfficers([]);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ paddingLeft: "67px", paddingTop: "150px" }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          {user?.hud_name?.toUpperCase() || "HUD"} - Health Inspectors
        </Typography>

        <Box sx={{ height: 400 }}>
          <DataGrid
            rows={officers.map((o, i) => ({ id: i + 1, ...o }))}
            columns={[
              { field: "user_id", headerName: "User ID", flex: 1 },
              { field: "username", headerName: "Username", flex: 1 },
              { field: "email", headerName: "Email", flex: 1 },
              { field: "phone_number", headerName: "Phone", flex: 1 },
              // { field: "village_name", headerName: "Village", flex: 1 },
              { field: "block_name", headerName: "Block", flex: 1 },
              // No action column - view only
            ]}
            pageSize={5}
            rowsPerPageOptions={[5]}
            disableSelectionOnClick
          />
        </Box>
      </Box>
    </DashboardLayout>
  );
}
