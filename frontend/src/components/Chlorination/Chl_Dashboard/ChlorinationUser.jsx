import React, { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import {
  Box, Typography, Button, Stack, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, IconButton, InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const ChlUserStats = () => {
  const [users, setUsers] = useState([]);
  const [hubsData, setHubsData] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
   const [editableFields, setEditableFields] = useState({ email: false, password: false, phone_number: false });
  const [form, setForm] = useState({
    user_id: "",
    username: "",
    password: "",
    email: "",
    hub_id: "",
    phone_number: "",
    address: "",
    status: "Active",
    role: "hub_officer",
    module: "chlorination",
  });
  const [editUser, setEditUser] = useState(null);

  const hubMap = {
  hub001: "REG001",
  hub002: "REG002",
  hub003: "REG003",
  hub004: "REG004",
};

const getDisplayUserId = (userId) => {
  const matchedHub = Object.keys(hubMap).find((hub) => userId.startsWith(hub));
  if (!matchedHub) return userId;
  return userId.replace(matchedHub, hubMap[matchedHub]);
};

  useEffect(() => {
    fetchUsers();
    fetchHubs();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/chl-hubusers");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error("Failed to fetch users");
    }
  };

  const fetchHubs = async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard/hubs-districts");
      const data = await res.json();
      setHubsData(data);
    } catch (err) {
      toast.error("Failed to fetch hubs");
    }
  };

  const validatePassword = (value) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{8,}$/.test(value);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "hub_id") {
      const userCount = users.filter((u) => u.hub_id === value).length + 1;
      const newUserId = `${value}USR${String(userCount).padStart(3, "0")}`;
      setForm((prev) => ({ ...prev, hub_id: value, user_id: newUserId }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "password") {
      setPasswordError(
        validatePassword(value)
          ? ""
          : "Password must be 8+ chars, 1 uppercase, 1 number, 1 special char"
      );
    }
  };

  const handleSubmit = async () => {
    if (!validatePassword(form.password)) {
      setPasswordError("Password must be 8+ chars, 1 uppercase, 1 number, 1 special char");
      toast.error("Invalid password format");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/dashboard/chl-hubusers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      toast.success("User added successfully");
      await fetchUsers();
      setForm({
        user_id: "",
        username: "",
        password: "",
        email: "",
        hub_id: "",
        phone_number: "",
        address: "",
        status: "Active",
        role: "hub_officer",
        module: "chlorination",
      });
      setPasswordError("");
      setOpen(false);
    } catch (err) {
      toast.error("Error submitting user data");
    }
  };

   const handleEditClick = (user) => {
    setEditUser(user);
    setEditableFields({ email: false, password: false, phone_number: false });
    setEditOpen(true);
    setShowPassword(false);
    setPasswordError("");
  };

  const toggleEditable = (field) => {
    setEditableFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
    if (name === "password") {
      setPasswordError(
        validatePassword(value)
          ? ""
          : "Password must be 8+ chars, 1 uppercase, 1 number, 1 special char"
      );
    }
  };

  const handleEditSubmit = async () => {
    if (!validatePassword(editUser.password)) {
      setPasswordError("Password must be 8+ chars, 1 uppercase, 1 number, 1 special char");
      toast.error("Invalid password format");
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/dashboard/chl-hubusers/${editUser.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editUser.email,
          password: editUser.password,
          phone_number: editUser.phone_number,
        }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      toast.success("User updated successfully");
      setEditOpen(false);
      setEditUser(null);
      setPasswordError("");
      await fetchUsers();
    } catch (err) {
      toast.error("Error updating user");
    }
  };

  const handleDelete = async (user_id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const res = await fetch(`http://localhost:3000/dashboard/chl-hubusers/${user_id}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete user");

        toast.success("User deleted successfully");
        await fetchUsers();
      } catch (err) {
        toast.error("Error deleting user");
      }
    }
  };

  return (
    <DashboardLayout>
      <ToastContainer position="top-right" autoClose={3000} />

      <Box mt={4} sx={{ background: "#fff", borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", p: 2,paddingTop: 15, paddingLeft:10 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#2A2F5B", mb: 2 }}>
          STATE USERS
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{
              background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
              color: "#fff",
              borderRadius: 2,
              fontWeight: 700,
              px: 3,
              "&:hover": {
                background: "linear-gradient(90deg, #1565c0 0%, #64b5f6 100%)",
              },
            }}
          >
            Add User
          </Button>
        </Box>

        <DataGrid
          rows={users}
          columns={[
            // { field: "user_id", headerName: "User ID", width: 160 },
            { field: "username", headerName: "Username", width: 150 },
            { field: "email", headerName: "Email", width: 180 },
            // { field: "password", headerName: "Password", width: 150 },
            // { field: "hub_id", headerName: "RWAL ID", width: 120 },
            { field: "hub_name", headerName: "RWAL Name", width: 180 },
            { field: "phone_number", headerName: "Phone Number", width: 150 },
            { field: "address", headerName: "Address", width: 200 },
            { field: "status", headerName: "Status", width: 100 },
            // { field: "role", headerName: "Role", width: 120 },
            // { field: "module", headerName: "Module", width: 140 },
            {
              field: "edit",
              headerName: "Edit",
              width: 80,
              renderCell: (params) => (
                <IconButton onClick={() => handleEditClick(params.row)}>
                  <EditIcon />
                </IconButton>
              ),
              sortable: false,
              filterable: false,
            },
            {
              field: "delete",
              headerName: "Delete",
              width: 80,
              renderCell: (params) => (
                <IconButton color="error" onClick={() => handleDelete(params.row.user_id)}>
                  <DeleteIcon />
                </IconButton>
              ),
              sortable: false,
              filterable: false,
            },
          ]}
          getRowId={(row) => row.user_id}
          pageSize={5}
          sx={{
            width: '100%',
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#0D47A1", // deep blue
              color: "black",              // white text
              fontWeight: "bold",
              fontSize: "1.1rem",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: "auto",
            },
          }}
          autoHeight


        />

        {/* Add Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add User</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <FormControl fullWidth>
                <InputLabel id="hub-label">Regional Water Analysis Laboratory</InputLabel>
                <Select
                  labelId="hub-label"
                  name="hub_id"
                  value={form.hub_id}
                  onChange={handleChange}
                  label="Hub"
                >
                  <MenuItem value="">Select Regional Water Analysis Laboratory</MenuItem>
                  {hubsData.map((hub) => (
                    <MenuItem key={hub.hub_id} value={hub.hub_id}>
                      {hub.hub_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {form.hub_id && (
                <>
                 
                  <TextField label="Username" name="username" value={form.username} onChange={handleChange} fullWidth />
                  <TextField label="Email" name="email" value={form.email} onChange={handleChange} type="email" fullWidth />
                  <TextField
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    error={!!passwordError}
                    helperText={passwordError}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Phone Number"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    inputProps={{ maxLength: 10, inputMode: "numeric" }}
                    error={form.phone_number && form.phone_number.length !== 10}
                    helperText={form.phone_number && form.phone_number.length !== 10 ? "Phone number must be 10 digits" : ""}
                    fullWidth
                  />
                  <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth />
                  <TextField label="Module" name="module" value={form.module} onChange={handleChange} fullWidth />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="error" variant="outlined">Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!form.user_id}>Add</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        {editUser && (
          <Stack spacing={2} mt={1}>
            <TextField
              label="Email"
              name="email"
              value={editUser.email}
              onChange={handleEditChange}
              type="email"
              fullWidth
              InputProps={{
                readOnly: !editableFields.email,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleEditable("email")}> <EditIcon /> </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={editUser.password}
              onChange={handleEditChange}
              error={!!passwordError}
              helperText={passwordError}
              fullWidth
              InputProps={{
                readOnly: !editableFields.password,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                    <IconButton onClick={() => toggleEditable("password")}> <EditIcon /> </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Phone Number"
              name="phone_number"
              value={editUser.phone_number}
              onChange={handleEditChange}
              inputProps={{ maxLength: 10, inputMode: "numeric" }}
              error={editUser.phone_number && editUser.phone_number.length !== 10}
              helperText={editUser.phone_number && editUser.phone_number.length !== 10 ? "Phone number must be 10 digits" : ""}
              fullWidth
              InputProps={{
                readOnly: !editableFields.phone_number,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleEditable("phone_number")}> <EditIcon /> </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditOpen(false)} color="error" variant="outlined">Cancel</Button>
        <Button onClick={handleEditSubmit} variant="contained" disabled={!editUser}>Save</Button>
      </DialogActions>
    </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default ChlUserStats;
