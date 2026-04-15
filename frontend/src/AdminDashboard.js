import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('organisation');
  const [orgSubTab, setOrgSubTab] = useState('teams');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch users when Members tab is active
  useEffect(() => {
    if (activeTab === 'organisation' && orgSubTab === 'members') {
      setLoading(true);
      fetch('http://localhost:8000/users')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch users');
          return res.json();
        })
        .then(data => {
          setUsers(data);
          setLoading(false);
        })
        .catch(err => {
          setError('Error loading users');
          setLoading(false);
        });
    }
  }, [activeTab, orgSubTab]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`http://localhost:8000/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setUsers(users.filter(u => u.id !== id));
    } catch {
      alert('Failed to delete user');
    }
  };

  return (
    <div>
      {/* Custom header for admin dashboard */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#f5f5f5', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 32, fontWeight: 'bold', fontSize: '1rem', color: '#333' }}></div>
        <div style={{ fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: 1 }}>Admin Panel</div>
        <div style={{ position: 'absolute', right: 32 }}>
          {/* Profile/email section, if needed, can be added here or left empty if handled globally */}
        </div>
      </header>
      <div className="admin-dashboard-container">
        <aside className="sidebar">
          {/* Removed Admin Panel from sidebar */}
          <button
            className={`sidebar-tab${activeTab === 'organisation' ? ' active' : ''}`}
            onClick={() => setActiveTab('organisation')}
          >
            Organisation
          </button>
          {/* Add more sidebar tabs here if needed */}
        </aside>
        <main className="admin-main-content">
          {activeTab === 'organisation' && (
            <div>
              {/* Removed Organisation heading as requested */}
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <button
                  className={`sidebar-tab${orgSubTab === 'teams' ? ' active' : ''}`}
                  style={{
                    minWidth: 100,
                    background: orgSubTab === 'teams' ? '#e3e6f0' : 'none',
                    fontWeight: orgSubTab === 'teams' ? 600 : 400,
                    borderRadius: 4,
                    border: orgSubTab === 'teams' ? '1.5px solid #3949ab' : '1px solid #bbb',
                    color: orgSubTab === 'teams' ? '#222' : '#333',
                  }}
                  onClick={() => setOrgSubTab('teams')}
                >Teams</button>
                <button
                  className={`sidebar-tab${orgSubTab === 'members' ? ' active' : ''}`}
                  style={{
                    minWidth: 100,
                    background: orgSubTab === 'members' ? '#e3e6f0' : 'none',
                    fontWeight: orgSubTab === 'members' ? 600 : 400,
                    borderRadius: 4,
                    border: orgSubTab === 'members' ? '1.5px solid #3949ab' : '1px solid #bbb',
                    color: orgSubTab === 'members' ? '#222' : '#333',
                  }}
                  onClick={() => setOrgSubTab('members')}
                >Members</button>
              </div>
              {orgSubTab === 'teams' && (
                <div className="org-list">
                  <div className="org-list-title">Teams</div>
                  {/* Example team list, replace with real data if needed */}
                  <div className="org-list-item">Team Alpha</div>
                  <div className="org-list-item">Team Beta</div>
                  <div className="org-list-item">Team Gamma</div>
                </div>
              )}
              {orgSubTab === 'members' && (
                <div className="org-list" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  {loading && <div>Loading...</div>}
                  {error && <div style={{color: 'red'}}>{error}</div>}
                  {!loading && !error && users.length === 0 && <div>No users found.</div>}
                  {!loading && !error && users.length > 0 && (
                    <div style={{overflowX: 'auto', width: '100%'}}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #e0e0e0', fontWeight: 600, minWidth: 220 }}>Email</th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #e0e0e0', fontWeight: 600, minWidth: 100 }}>Role</th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #e0e0e0', fontWeight: 600, minWidth: 100 }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '10px 8px', verticalAlign: 'middle', textAlign: 'left' }}>{user.email}</td>
                              <td style={{ padding: '10px 8px', verticalAlign: 'middle', textAlign: 'left' }}>{user.role}</td>
                              <td style={{ padding: '10px 8px', verticalAlign: 'middle', textAlign: 'left' }}>
                                <button onClick={() => handleDelete(user.id)} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
