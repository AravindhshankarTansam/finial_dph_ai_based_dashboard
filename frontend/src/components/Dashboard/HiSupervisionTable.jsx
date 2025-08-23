import React, { useEffect, useState } from "react";
import {
  Table,
  Spinner,
  Form,
  Row,
  Col,
  Button as BootstrapButton,
  Modal,
} from "react-bootstrap";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import DashboardLayout from "./DashboardLayout";

const HISupervisionTable = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [districtFilter, setDistrictFilter] = useState("");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [verifiedStatus, setVerifiedStatus] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null); // 👈 for modal zoom

  const totalTarget = 50;

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
              block_name: item.block_name || "N/A",
              entries: [item.date || new Date().toISOString()],
              geolocation: item.geolocation || null,
              photos: item.photos || [],
            };
          } else {
            counts[username].count += 1;
            counts[username].entries.push(item.date || new Date().toISOString());
            if (item.photos) {
              counts[username].photos = [
                ...counts[username].photos,
                ...item.photos,
              ];
            }
          }
        });

        const values = Object.values(counts);
        setData(values);
        setFilteredData(values);
      } catch (err) {
        console.error("Error fetching user contribution data", err);
      }
    };

    fetchData();
  }, []);

  // Filters
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

  // Date filter
  useEffect(() => {
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split("-");
        return new Date(`${year}-${month}-${day}`);
      }
      return new Date(dateStr);
    };

    let filtered = [...data];

    if (districtFilter) {
      filtered = filtered.filter((item) => item.district === districtFilter);
    }

    if (usernameFilter) {
      filtered = filtered.filter((item) => item.username === usernameFilter);
    }

    if (fromDate || toDate) {
      const from = parseDate(fromDate);
      const to = parseDate(toDate);

      filtered = filtered
        .map((item) => {
          const filteredEntries = item.entries.filter((entry) => {
            const entryDate = new Date(entry);
            return (!from || entryDate >= from) && (!to || entryDate <= to);
          });

          return {
            ...item,
            entries: filteredEntries,
            count: filteredEntries.length,
          };
        })
        .filter((item) => item.count > 0);
    }

    setFilteredData(filtered);
  }, [data, districtFilter, usernameFilter, fromDate, toDate]);

  // Format geolocation
  const formatGeo = (geo) => {
    if (!geo || typeof geo !== "object") return "N/A";
    const { latitude, longitude } = geo;
    if (!latitude || !longitude) return "N/A";
    return `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
  };

  // Download Excel
  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("User Contributions");

    worksheet.columns = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "HI Name", key: "username", width: 25 },
      { header: "District", key: "district", width: 25 },
      { header: "Block", key: "block", width: 20 },
      { header: "No. of Houses Inspected", key: "count", width: 20 },
      { header: "Target Houses", key: "totalTarget", width: 15 },
      { header: "% Visited", key: "percent", width: 15 },
      { header: "Verified", key: "verified", width: 15 },
      { header: "Geolocation", key: "geo", width: 30 },
    ];

    filteredData.forEach((item, index) => {
      const percent = ((item.count / totalTarget) * 100).toFixed(2) + "%";
      worksheet.addRow({
        sno: index + 1,
        username: item.username,
        district: item.district,
        block: item.block_name,
        count: item.count,
        totalTarget: totalTarget,
        percent,
        verified: verifiedStatus[item.username] || "No",
        geo: formatGeo(item.geolocation),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "UserContributionReport.xlsx");
  };

  // Handle verification
  const handleVerify = async (username, status) => {
    try {
      await fetch(
        `http://localhost:3000/dashboard/datacollection/verify/${username}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: status }),
        }
      );
      setVerifiedStatus((prev) => ({ ...prev, [username]: status }));
    } catch (err) {
      console.error("Error updating verification", err);
    }
  };

  if (!data.length) return <Spinner animation="border" variant="primary" />;

  const districtOptions = [...new Set(data.map((d) => d.district))].sort();
  const usernameOptions = [...new Set(data.map((d) => d.username))].sort();

  const totalEntries = filteredData.reduce((sum, u) => sum + u.count, 0);
  const totalTargets = filteredData.length * totalTarget;

  return (
    <DashboardLayout>
      <div className="mt-4 mt-150" style={{ marginLeft: 100 }}>
        <h5
          style={{
            fontWeight: 700,
            fontFamily: "Nunito, Poppins, sans-serif",
            marginBottom: 16,
          }}
        >
          VISITED HOUSE COUNTS BY USERS
        </h5>

        <p>
          <strong>No. of DBC's allotted under you:</strong> {filteredData.length}
        </p>

        {/* Filters + Download Button */}
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
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>S.NO</th>
              <th>HI Name</th>
              <th>District</th>
              <th>Block</th>
              <th>No. of Houses Inspected</th>
              <th>Target House</th>
              <th>% of Houses Visited</th>
              <th>Verified by HI</th>
              <th>Geolocation</th>
              <th>Photos</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((user, idx) => {
              const percentVisited = ((user.count / totalTarget) * 100).toFixed(2);
              const percentValue = parseFloat(percentVisited);

              // Coloring logic for % Visited column
              let percentCellStyle = {
                fontWeight: 600,
                textAlign: "center",
              };
              if (percentValue < 80) {
                percentCellStyle.backgroundColor = "#f8d7da"; // red
              } else if (percentValue < 100) {
                percentCellStyle.backgroundColor = "#fff3cd"; // yellow
              } else {
                percentCellStyle.backgroundColor = "#d4edda"; // green
              }

              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{user.username}</td>
                  <td>{user.district}</td>
                  <td>{user.block_name}</td>
                  <td>{user.count}</td>
                  <td>{totalTarget}</td>
                  <td style={percentCellStyle}>{percentVisited}%</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <BootstrapButton
                        size="sm"
                        variant={
                          verifiedStatus[user.username] === "Yes"
                            ? "success"
                            : "outline-success"
                        }
                        onClick={() => handleVerify(user.username, "Yes")}
                      >
                        Yes
                      </BootstrapButton>
                      <BootstrapButton
                        size="sm"
                        variant={
                          verifiedStatus[user.username] === "No"
                            ? "danger"
                            : "outline-danger"
                        }
                        onClick={() => handleVerify(user.username, "No")}
                      >
                        No
                      </BootstrapButton>
                    </div>
                  </td>
                  <td>{formatGeo(user.geolocation)}</td>
                  <td>
                    {(user.photos && user.photos.length > 0
                      ? user.photos.slice(0, 10)
                      : Array.from({ length: 10 }, (_, i) =>
                          `https://via.placeholder.com/40?text=Img${i + 1}`
                        )
                    ).map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt="user upload"
                        style={{
                          width: 40,
                          height: 40,
                          marginRight: 4,
                          borderRadius: 4,
                          objectFit: "cover",
                          border: "1px solid #ccc",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedPhoto(photo)} // zoom on click
                      />
                    ))}
                  </td>
                </tr>
              );
            })}
            {/* Footer row for totals */}
            <tr style={{ fontWeight: "bold", backgroundColor: "#f1f1f1" }}>
              <td colSpan={4} className="text-end">
                Total
              </td>
              <td>{totalEntries}</td>
              <td>{totalTargets}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </Table>

        {/* Modal for zoomed image */}
        <Modal
          show={!!selectedPhoto}
          onHide={() => setSelectedPhoto(null)}
          centered
          size="lg"
        >
          <Modal.Body className="text-center">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="zoomed"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "8px",
                }}
              />
            )}
          </Modal.Body>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default HISupervisionTable;