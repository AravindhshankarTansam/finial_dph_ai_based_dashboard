
import React, { useState } from "react";
import HudHeader from "./hudHeader";
import HudSidebar from "./hudSidebar";
import useMediaQuery from "@mui/material/useMediaQuery";

const SIDEBAR_WIDTH = 250;
const SIDEBAR_COLLAPSED_WIDTH = 60;

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery("(max-width:767px)");

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div>
      {/* Fixed Header */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 1200
      }}>
        <HudHeader toggleSidebar={toggleSidebar} />
      </div>

      {/* Fixed Sidebar (desktop only) */}
      {!isMobile && (
        <div
          className="sidebar-container"
          style={{
            position: "fixed",
            top: 60, // height of header
            left: 0,
            width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            height: "calc(100vh - 60px)",
            zIndex: 1100,
            transition: "width 0.3s",
            overflow: "hidden",
            background: "#f5f5f5",
            borderRight: "1px solid #e0e0e0"
          }}
        >
          <HudSidebar
            isOpen={sidebarOpen}
            closeSidebar={closeSidebar}
            collapsed={sidebarCollapsed}
            toggleCollapse={toggleCollapse}
            isMobile={false}
          />
        </div>
      )}

      {/* Main Content */}
      <main
        className="main-content"
        style={{
          marginTop: 60,
          marginLeft: !isMobile
            ? (sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH)
            : 0,
          transition: "margin-left 0.3s",
          minHeight: "calc(100vh - 60px)",
          padding: 24,
          paddingTop: 24,
          background: "#fafbfc",
        }}
      >
        {children}
      </main>

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <HudSidebar
          isOpen={sidebarOpen}
          closeSidebar={closeSidebar}
          isMobile={true}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
