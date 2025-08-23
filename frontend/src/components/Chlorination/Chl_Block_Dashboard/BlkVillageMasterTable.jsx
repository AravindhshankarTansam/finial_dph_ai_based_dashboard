import React, { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

export default function BlkVillageMasterTable() {
  const [villages, setVillages] = useState([]);
  const [open, setOpen] = useState(false);
  const [villageName, setVillageName] = useState("");

  const [hudBlocks, setHudBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedBlockName, setSelectedBlockName] = useState("");

  const [currentHudId, setCurrentHudId] = useState(null);
  const [currentHudName, setCurrentHudName] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setCurrentHudId(parsedUser.hud_id);
      setCurrentHudName(parsedUser.hud_name);
    }
  }, []);

  useEffect(() => {
    fetchVillages();
    fetchHudBlocks();
  }, [currentHudId]);

  const fetchVillages = async () => {
    try {
      if (!currentHudId) return;
      const res = await fetch(`http://localhost:3000/dashboard/village`);
      if (!res.ok) throw new Error("Failed to fetch villages");
      const data = await res.json();
      const filtered = data.filter((v) => v.hud_id === currentHudId);
      setVillages(filtered);
    } catch (err) {
      console.error("Error fetching villages:", err);
      setVillages([]);
    }
  };

  const fetchHudBlocks = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/hud-blocks");
      if (!res.ok) throw new Error("Failed to fetch HUD blocks");
      const data = await res.json();
      const filtered = data.filter((b) => b.hud_id === currentHudId);
      setHudBlocks(filtered);
    } catch (err) {
      console.error("Error fetching HUD blocks:", err);
      setHudBlocks([]);
    }
  };

  const handleAdd = async () => {
    if (!villageName.trim() || !currentHudId || !currentHudName || !selectedBlockId || !selectedBlockName) return;

    try {
      const res = await fetch("http://localhost:3000/dashboard/village", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          village_name: villageName.trim(),
          hud_id: currentHudId,
          hud_name: currentHudName,
          block_id: selectedBlockId,
          block_name: selectedBlockName,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to add village: ${res.status} - ${errorText}`);
      }

      await fetchVillages();
      handleCloseDialog();
    } catch (err) {
      alert("Error adding village: " + err.message);
    }
  };

  const handleCloseDialog = () => {
    setVillageName("");
    setSelectedBlockId("");
    setSelectedBlockName("");
    setOpen(false);
  };

  const handleBlockChange = (e) => {
    const blockId = e.target.value;
    setSelectedBlockId(blockId);
    const block = hudBlocks.find((b) => b.block_id === blockId);
    setSelectedBlockName(block?.block_name || "");
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, pt: 20, pl: 10 }}>
        <Typography variant="h5" mb={2}>
          Village Master Table
        </Typography>

        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Village
        </Button>

        <Table sx={{ mt: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Village ID</strong></TableCell>
              <TableCell><strong>Village Name</strong></TableCell>
              <TableCell><strong>HUD Name</strong></TableCell>
              <TableCell><strong>Block Name</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {villages.map((row) => (
              <TableRow key={row.village_id}>
                <TableCell>{row.village_id}</TableCell>
                <TableCell>{row.village_name}</TableCell>
                <TableCell>{row.hud_name}</TableCell>
                <TableCell>{row.block_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onClose={handleCloseDialog}>
          <DialogTitle>Add New Village</DialogTitle>
          <DialogContent>
            <TextField
              label="Village Name"
              fullWidth
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              margin="dense"
              autoFocus
            />

            <TextField
              label="HUD"
              fullWidth
              value={currentHudName || ""}
              margin="dense"
              InputProps={{ readOnly: true }}
            />

            <FormControl fullWidth margin="dense">
              <InputLabel>Select Block</InputLabel>
              <Select
                value={selectedBlockId}
                onChange={handleBlockChange}
                label="Select Block"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {hudBlocks.map((block) => (
                  <MenuItem key={block.block_id} value={block.block_id}>
                    {block.block_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleAdd}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
