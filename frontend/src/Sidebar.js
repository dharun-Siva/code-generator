import React, { useState } from 'react';

import './Sidebar.css';
import { FaHome, FaChalkboardTeacher, FaUserGraduate, FaUsers, FaCalendarAlt, FaFileInvoiceDollar, FaBook, FaComments, FaUsersCog, FaUpload, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Sidebar = ({ user, profileOpen, setProfileOpen, profileRef, onLogout, onNewChat, chats = [], onSelectChat, onDeleteChat, onDashboard }) => {
  const [showChats, setShowChats] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        className="sidebar-toggle-btn"
        style={{ left: collapsed ? 44 : 240 }}
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </button>
      <ul>
        <li style={{ cursor: 'pointer' }} onClick={() => onDashboard()}>
          <span className="sidebar-icon"><FaHome /></span>
          {!collapsed && <span className="sidebar-text">Dashboard</span>}
        </li>
        <li style={{ cursor: 'pointer' }} onClick={() => onNewChat()}>
          <span className="sidebar-icon"><FaChalkboardTeacher /></span>
          {!collapsed && <span className="sidebar-text">Create Application</span>}
        </li>
        <li style={{ cursor: 'pointer' }} onClick={() => setShowChats(!showChats)}>
          <span className="sidebar-icon"><FaComments /></span>
          {!collapsed && <span className="sidebar-text">Search chats ({chats.length})</span>}
        </li>
      </ul>

      {/* Chat List */}
      {showChats && !collapsed && (
        <div className="sidebar-chat-list">
          {chats.length === 0 ? (
            <div className="sidebar-no-chats">No chats yet. Start by creating an application!</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="sidebar-chat-item">
                <div
                  className="sidebar-chat-item-content"
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                >
                  <div className="sidebar-chat-title">{chat.title}</div>
                  <div className="sidebar-chat-date">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </div>
                  <div className="sidebar-chat-status">
                    Processing
                  </div>
                </div>
                <button
                  className="sidebar-chat-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this chat?')) {
                      onDeleteChat(chat.id);
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
