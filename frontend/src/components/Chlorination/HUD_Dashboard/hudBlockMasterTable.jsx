import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DashboardLayout from "./DashboardLayout";

export default function BlockMasterTable() {
  const [blocks, setBlocks] = useState([]);
  const [huds, setHuds] = useState([]);
  const [open, setOpen] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [selectedHud, setSelectedHud] = useState("");
  const [loggedInHudId, setLoggedInHudId] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user?.hud_id) {
      setLoggedInHudId(user.hud_id);
    }
  }, []);

  // Once hud_id is set, fetch data
  useEffect(() => {
    if (loggedInHudId) {
      fetchBlocks();
      fetchHuds();
    }
  }, [loggedInHudId]);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/hud-blocks");
      const data = await res.json();
      setBlocks(data.filter((b) => b.hud_id === loggedInHudId));
    } catch (err) {
      console.error("Failed to fetch blocks:", err);
    }
  };

  const fetchHuds = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/hud");
      const data = await res.json();
      setHuds(data);
    } catch (err) {
      console.error("Failed to fetch HUDs:", err);
    }
  };

  const handleAdd = async () => {
    if (!blockName.trim() || !selectedHud) return;

    const hud = huds.find(h => h.hud_id === selectedHud);
    if (!hud) return;

    try {
      const res = await fetch("http://localhost:3000/dashboard/hud-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block_name: blockName.trim(),
          hud_id: hud.hud_id,
          hud_name: hud.hud_name,
        }),
      });

      if (!res.ok) throw new Error("Failed to add block");

      fetchBlocks();
      setBlockName("");
      setSelectedHud("");
      setOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ p: 3, paddingTop: 20, paddingLeft: 10 }}>
        <Typography variant="h5" mb={2}>HUD-Block Master Table</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Block</Button>

        <Table sx={{ mt: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Block ID</strong></TableCell>
              <TableCell><strong>Block Name</strong></TableCell>
              <TableCell><strong>HUD ID</strong></TableCell>
              <TableCell><strong>HUD Name</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blocks.map((block) => (
              <TableRow key={block.block_id}>
                <TableCell>{block.block_id}</TableCell>
                <TableCell>{block.block_name}</TableCell>
                <TableCell>{block.hud_id}</TableCell>
                <TableCell>{block.hud_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Add New Block</DialogTitle>
          <DialogContent>
            <TextField
              label="Block Name"
              fullWidth
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              margin="dense"
              autoFocus
            />
            <Select
              fullWidth
              value={selectedHud}
              onChange={(e) => setSelectedHud(e.target.value)}
              displayEmpty
              sx={{ mt: 2 }}
            >
              <MenuItem value="" disabled>Select HUD</MenuItem>
              {huds
                .filter(h => h.hud_id === loggedInHudId) // Only HUD of logged-in user
                .map((hud) => (
                  <MenuItem key={hud.hud_id} value={hud.hud_id}>
                    {hud.hud_name} ({hud.hud_id})
                  </MenuItem>
                ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAdd}>Add</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
