import React, { useEffect, useState } from "react";
import {
  Table,
  Spinner,
  Form,
  Row,
  Col,
  Button as BootstrapButton,
} from "react-bootstrap";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";

const BlockUserContributionTable = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [districtFilter, setDistrictFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");

  const totalTarget = 50;

  // ✅ Get logged-in username from localStorage
  useEffect(() => {
    const username = localStorage.getItem("loggedInUsername");
    if (username) {
      setLoggedInUsername(username);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/dashboard/datacollection");
        const json = await res.json();

        const districtRes = await fetch("http://localhost:3000/dashboard/mos-district");
        const districts = await districtRes.json();

        const counts = {};

        json.forEach((item) => {
          const username = item.username;
          const userId = item.user_id;
          const districtCode = userId?.substring(0, 7).toUpperCase();
          const districtMatch = districts.find((d) =>
            d.district_code?.toUpperCase().startsWith(districtCode)
          );
          const district = districtMatch?.district_name || "Unknown";

          if (!counts[username]) {
            counts[username] = {
              username,
              count: 1,
              district,
            };
          } else {
            counts[username].count += 1;
          }
        });

        const values = Object.values(counts);

        // ✅ Filter for only the logged-in user, if available
        const finalData = loggedInUsername
          ? values.filter((entry) => entry.username === loggedInUsername)
          : values;

        setData(finalData);
        setFilteredData(finalData);
      } catch (err) {
        console.error("Error fetching user contribution data", err);
      }
    };

    fetchData();
  }, [loggedInUsername]);

  useEffect(() => {
    let filtered = [...data];
    if (districtFilter) {
      filtered = filtered.filter((item) => item.district === districtFilter);
    }
    if (usernameFilter) {
      filtered = filtered.filter((item) => item.username === usernameFilter);
    }
    setFilteredData(filtered);
  }, [districtFilter, usernameFilter, data]);

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("User Contributions");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Username", key: "username", width: 25 },
      { header: "District", key: "district", width: 25 },
      { header: "Entries", key: "count", width: 15 },
      { header: "Total Target", key: "totalTarget", width: 15 },
    ];

    filteredData.forEach((item, index) => {
      worksheet.addRow({
        sno: index + 1,
        username: item.username,
        district: item.district,
        count: item.count,
        totalTarget: totalTarget,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "UserContributionReport.xlsx");
  };

  if (!data.length)
    return <Spinner animation="border" variant="primary" />;

  const districtOptions = [...new Set(data.map((d) => d.district))].sort();
  const usernameOptions = [...new Set(data.map((d) => d.username))].sort();

  return (
    <div className="mt-4">
      <h5
        style={{
          fontWeight: 700,
          fontFamily: "Nunito, Poppins, sans-serif",
          marginBottom: 16,
        }}
      >
        VISITED HOUSE COUNTS BY USERS
      </h5>

      <Row className="align-items-end mb-3">
        <Col md={4}>
          <Form.Group controlId="districtSelect">
            <Form.Label>District</Form.Label>
            <Form.Select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            >
              <option value="">All Districts</option>
              {districtOptions.map((district, idx) => (
                <option key={idx} value={district}>
                  {district}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group controlId="usernameSelect">
            <Form.Label>User</Form.Label>
            <Form.Select
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
            >
              <option value="">All Users</option>
              {usernameOptions.map((user, idx) => (
                <option key={idx} value={user}>
                  {user}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={4} className="text-end">
          <BootstrapButton
            variant="success"
            onClick={downloadExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              fontFamily: "Nunito, sans-serif",
              padding: "6px 16px",
              whiteSpace: "nowrap",
            }}
          >
            <DownloadForOfflineIcon style={{ fontSize: "20px" }} />
            Download Excel
          </BootstrapButton>
        </Col>
      </Row>

      {/* Table */}
      <Table
        striped
        bordered
        hover
        responsive
        style={{ fontFamily: "Nunito, Poppins, sans-serif" }}
      >
        <thead>
          <tr>
            <th>S.NO</th>
            <th>Username</th>
            <th>District</th>
            <th>Entries</th>
            <th>Total Target</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((user, idx) => {
            const isTargetMet = user.count >= totalTarget;
            const entryCellStyle = {
              backgroundColor: isTargetMet ? "#d4edda" : "#f8d7da",
              fontWeight: 600,
              textAlign: "center",
            };

            return (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{user.username}</td>
                <td>{user.district}</td>
                <td style={entryCellStyle}>{user.count}</td>
                <td>{totalTarget}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default BlockUserContributionTable;
