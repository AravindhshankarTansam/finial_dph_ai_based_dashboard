import React, { useState } from "react";
import Header from "./BlockHeader";
import Sidebar from "./BlockSidebar";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 1000 }}>
        <Header toggleSidebar={toggleSidebar} />
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div
          className="sidebar-container"
          style={{
            width: 250,
            minWidth: 250,
            position: "sticky",
            top: 60, 
            height: "calc(100vh - 60px)",
            zIndex: 999,
          }}
        >
          <Sidebar isOpen={sidebarOpen} closeSidebar={closeSidebar} />
        </div>
        <main className="p-4 main-content" style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
      <style jsx="true">{`
        @media (max-width: 767px) {
          .sidebar-container {
            display: none;
          }
          .main-content {
            margin-left: 0 !important;
          }
        }
        @media (min-width: 768px) {
          .main-content {
           
            transition: margin-left 0.3s ease-in-out;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
