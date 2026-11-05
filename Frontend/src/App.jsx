import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  fetchUsers,
  fetchEvents,
  fetchEvent,
  createRegistration,
  fetchUserRegistrations,
  fetchEventAttendees,
} from './api';

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    ticket: <><path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V4H4z" /><path d="M13 4v2m0 3v2m0 3v2" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

function formatDate(value) {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function initials(email = '') {
  return email.split('@')[0].slice(0, 2).toUpperCase() || 'US';
}

function RoleBadge({ role }) {
  const isOrganiser = role?.toLowerCase() === 'organiser' || role?.toLowerCase() === 'organizer';
  return (
    <span className={`role-badge ${isOrganiser ? 'role-badge-organiser' : 'role-badge-attendee'}`}>
      {isOrganiser ? 'Organiser' : 'Attendee'}
    </span>
  );
}

/**
 * User Selector Dropdown menu with email, role, and details
 */
function UserDropdown({ users, selectedUser, onSelectUser, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) => u.email.toLowerCase().includes(term) || (u.role && u.role.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  return (
    <div className="user-dropdown-container" ref={dropdownRef}>
      <button
        className="user-trigger-btn"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        title="Select User Profile"
      >
        <span className="avatar avatar-badge">
          {initials(selectedUser?.email)}
          <span className={`status-indicator ${selectedUser?.role === 'organiser' ? 'status-organiser' : 'status-attendee'}`} />
        </span>
        <div className="user-trigger-text">
          <span className="user-trigger-email">{selectedUser?.email || 'Select a user'}</span>
          {selectedUser && <RoleBadge role={selectedUser.role} />}
        </div>
        <span className={`trigger-chevron ${open ? 'rotated' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="user-dropdown-panel" role="menu">
          <div className="dropdown-panel-header">
            <div>
              <span className="eyebrow">SELECT ACTIVE USER</span>
              <p className="dropdown-panel-subtitle">Choose a user profile to register for events</p>
            </div>
            {selectedUser && (
              <button
                className="dropdown-profile-link"
                onClick={() => {
                  setOpen(false);
                  onOpenProfile(selectedUser);
                }}
              >
                View Profile →
              </button>
            )}
          </div>

          <div className="dropdown-search-wrap">
            <Icon name="search" size={14} />
            <input
              type="text"
              className="dropdown-search-input"
              placeholder="Search by email or role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </div>

          <div className="dropdown-users-list">
            {filteredUsers.length === 0 ? (
              <div className="dropdown-empty">No users match "{searchTerm}"</div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUser?.uuid === user.uuid;
                return (
                  <button
                    key={user.uuid}
                    className={`dropdown-user-row ${isSelected ? 'active-row' : ''}`}
                    onClick={() => {
                      setOpen(false);
                      onSelectUser(user);
                    }}
                  >
                    <span className="avatar avatar-small">{initials(user.email)}</span>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-email-wrap">
                        <span className="dropdown-user-email">{user.email}</span>
                        <RoleBadge role={user.role} />
                      </div>
                      <span className="dropdown-user-id">{user.uuid.slice(0, 8)}…{user.uuid.slice(-4)}</span>
                    </div>
                    {isSelected && (
                      <span className="dropdown-check-icon">
                        <Icon name="check" size={16} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * User Profile Modal: Opened when selecting any user
 */
function UserProfileModal({ user, registrations, allEvents, onClose, onOpenEvent }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('registrations');

  const isOrganiser = user?.role?.toLowerCase() === 'organiser' || user?.role?.toLowerCase() === 'organizer';

  // Events organized by this user
  const hostedEvents = useMemo(() => {
    if (!isOrganiser || !user) return [];
    return allEvents.filter((ev) => String(ev.student_id) === String(user.uuid));
  }, [allEvents, user, isOrganiser]);

  function copyUuid() {
    if (!user?.uuid) return;
    navigator.clipboard.writeText(user.uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-heading">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close profile">
          <Icon name="close" />
        </button>

        <div className="profile-hero">
          <div className="profile-avatar-large">
            {initials(user?.email)}
            <span className={`profile-status-ring ${isOrganiser ? 'status-organiser' : 'status-attendee'}`} />
          </div>
          <div className="profile-hero-details">
            <div className="profile-top-tags">
              <span className="eyebrow">USER PROFILE</span>
              <RoleBadge role={user?.role} />
            </div>
            <h2 id="profile-heading">{user?.email}</h2>
            <div className="profile-id-box">
              <span className="id-label">UUID</span>
              <code className="id-code">{user?.uuid}</code>
              <button className="copy-btn" onClick={copyUuid} title="Copy UUID">
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="profile-stats-bar">
          <div className="stat-card">
            <span className="stat-number">{registrations.length}</span>
            <span className="stat-label">Registered Events</span>
          </div>
          {isOrganiser && (
            <div className="stat-card">
              <span className="stat-number">{hostedEvents.length}</span>
              <span className="stat-label">Events Hosted</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-number">{isOrganiser ? 'Host' : 'Student'}</span>
            <span className="stat-label">Account Type</span>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registered Events ({registrations.length})
          </button>
          {isOrganiser && (
            <button
              className={`profile-tab-btn ${activeTab === 'hosted' ? 'active' : ''}`}
              onClick={() => setActiveTab('hosted')}
            >
              Hosted by You ({hostedEvents.length})
            </button>
          )}
        </div>

        <div className="profile-tab-content">
          {activeTab === 'registrations' && (
            <div className="profile-event-list">
              {registrations.length === 0 ? (
                <div className="profile-empty-list">
                  <Icon name="ticket" size={32} />
                  <h4>No registrations yet</h4>
                  <p>{user?.email} hasn't registered for any events yet. Pick an event below to register!</p>
                  <button className="button button-dark" onClick={onClose}>
                    Explore Event Board <Icon name="arrow" size={14} />
                  </button>
                </div>
              ) : (
                registrations.map((reg) => {
                  const event = reg.event;
                  return (
                    <div key={reg.id} className="profile-event-item">
                      <div className="profile-event-info">
                        <h4>{event ? event.title : 'Event Details'}</h4>
                        <div className="profile-event-meta">
                          <span>
                            <Icon name="calendar" size={13} /> Registered {formatDate(reg.created_at)}
                          </span>
                          {event && <span>Capacity: {event.capacity} spots</span>}
                        </div>
                      </div>
                      {event && (
                        <button
                          className="button button-soft button-small"
                          onClick={() => {
                            onClose();
                            onOpenEvent(event);
                          }}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'hosted' && isOrganiser && (
            <div className="profile-event-list">
              {hostedEvents.length === 0 ? (
                <div className="profile-empty-list">
                  <Icon name="spark" size={32} />
                  <h4>No hosted events</h4>
                  <p>You haven't created any events under this organizer account yet.</p>
                </div>
              ) : (
                hostedEvents.map((event) => (
                  <div key={event.event_id} className="profile-event-item">
                    <div className="profile-event-info">
                      <h4>{event.title}</h4>
                      <div className="profile-event-meta">
                        <span><Icon name="calendar" size={13} /> Created {formatDate(event.created_at)}</span>
                        <span>Capacity: {event.capacity}</span>
                      </div>
                    </div>
                    <button
                      className="button button-soft button-small"
                      onClick={() => {
                        onClose();
                        onOpenEvent(event);
                      }}
                    >
                      Host Tools & Attendees
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="profile-modal-footer">
          <span className="profile-active-hint">
            Active user: <strong>{user?.email}</strong>. Any event registrations will be linked to this account.
          </span>
          <button className="button button-dark" onClick={onClose}>
            Done & Browse Events
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Event Card on the main board
 */
function EventCard({ event, currentUser, onOpen, onRegister, registering, isRegistered }) {
  const isHostedByMe = currentUser && String(event.student_id) === String(currentUser.uuid);

  return (
    <article className="event-card">
      <button className="card-main" onClick={() => onOpen(event)} aria-label={`View ${event.title}`}>
        <div className="card-topline">
          <span className="event-tag">
            <span className="tag-dot" />
            {isHostedByMe ? 'YOUR EVENT' : 'COMMUNITY'}
          </span>
          <span className="card-arrow">
            <Icon name="arrow" />
          </span>
        </div>
        <div className="card-title-wrap">
          <h3>{event.title}</h3>
          <p className="event-date">
            <Icon name="calendar" size={15} /> Added {formatDate(event.created_at)}
          </p>
        </div>
        <div className="capacity-row">
          <span>
            <Icon name="people" size={16} /> Capacity
          </span>
          <strong>
            {event.capacity ?? '—'} <small>spots</small>
          </strong>
        </div>
        <div className="capacity-track">
          <span style={{ width: '100%' }} />
        </div>
      </button>

      <div className="card-footer">
        <button className="footer-details-btn" onClick={() => onOpen(event)}>
          Event details
        </button>

        {isRegistered ? (
          <span className="registered-badge" title="Already registered">
            <Icon name="check" size={14} /> Registered
          </span>
        ) : (
          <button
            className="register-btn"
            onClick={() => onRegister(event)}
            disabled={registering}
            aria-label={`Register ${currentUser?.email || 'user'} for ${event.title}`}
          >
            {registering ? 'Saving…' : 'Register'}
            {!registering && <Icon name="arrow" size={14} />}
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * Event Dialog with full details, registration action, and attendee list for organizer
 */
function EventDialog({ event, currentUser, onClose, onRegister, registering, isRegistered }) {
  const [attendees, setAttendees] = useState(null);
  const [attendeeError, setAttendeeError] = useState('');
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const isOwner = currentUser?.uuid && String(currentUser.uuid) === String(event.student_id);

  async function loadAttendees() {
    setLoadingAttendees(true);
    setAttendeeError('');
    try {
      const data = await fetchEventAttendees(event.event_id, currentUser.uuid);
      setAttendees(data);
    } catch (err) {
      setAttendeeError(err.message || 'Could not load attendees.');
    } finally {
      setLoadingAttendees(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>

        <div className="detail-art">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-spark">
            <Icon name="spark" size={36} />
          </span>
          <span className="art-caption">COMMUNITY EVENT</span>
        </div>

        <div className="detail-content">
          <div className="detail-tags-row">
            <span className="event-tag">
              <span className="tag-dot" /> {isOwner ? 'ORGANIZED BY YOU' : 'COMMUNITY GATHERING'}
            </span>
          </div>

          <h2 id="event-title">{event.title}</h2>
          <p className="detail-date">
            <Icon name="calendar" size={17} /> Added {formatDate(event.created_at)}
          </p>

          <div className="detail-stats">
            <div>
              <span>Capacity</span>
              <strong>{event.capacity ?? 'Not specified'} spots</strong>
            </div>
            <div>
              <span>Event ID</span>
              <strong className="id-value">{event.event_id}</strong>
            </div>
          </div>

          <p className="detail-copy">
            A little time together can turn an ordinary day into a good story. Register your spot below for{' '}
            <strong>{currentUser?.email || 'this profile'}</strong>.
          </p>

          {isRegistered ? (
            <div className="already-registered-callout">
              <Icon name="check" size={20} />
              <div>
                <strong>You are registered!</strong>
                <p>A spot is reserved for {currentUser?.email}.</p>
              </div>
            </div>
          ) : (
            <button
              className="button button-dark button-full"
              onClick={() => onRegister(event)}
              disabled={registering}
            >
              {registering ? 'Registering…' : `Register as ${currentUser?.email || 'active user'}`}
              <Icon name="arrow" />
            </button>
          )}

          {isOwner && (
            <div className="attendees-block">
              <div className="attendee-heading">
                <div>
                  <p className="eyebrow">ORGANIZER CONTROLS</p>
                  <h3>Attendee List</h3>
                </div>
                <button
                  className="button button-soft"
                  onClick={loadAttendees}
                  disabled={loadingAttendees}
                >
                  {loadingAttendees ? 'Loading…' : attendees ? 'Refresh Attendees' : 'View Attendees'}
                </button>
              </div>

              {attendeeError && <p className="inline-error">{attendeeError}</p>}

              {attendees && (
                attendees.length > 0 ? (
                  <ul className="attendee-list">
                    {attendees.map((attendee) => (
                      <li key={attendee.id}>
                        <span className="avatar avatar-small">
                          {initials(attendee.user?.email || 'ST')}
                        </span>
                        <div className="attendee-user-details">
                          <span className="attendee-email">{attendee.user?.email || 'Registered Student'}</span>
                          <span className="attendee-time">{formatDate(attendee.created_at)}</span>
                        </div>
                        <span className="attendee-role">{attendee.user?.role || 'attendee'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted" style={{ marginTop: '12px' }}>
                    No registrations yet for this event.
                  </p>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [error, setError] = useState('');

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registeringId, setRegisteringId] = useState('');
  const [toast, setToast] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set of registered event IDs for the selected user
  const registeredIds = useMemo(() => {
    return new Set(myRegistrations.map((r) => String(r.event_id)));
  }, [myRegistrations]);

  // Load users on initial mount
  useEffect(() => {
    let alive = true;
    fetchUsers()
      .then((userList) => {
        if (!alive || !userList || userList.length === 0) return;
        setUsers(userList);

        // Check localStorage for previously selected user ID
        const savedUuid = localStorage.getItem('gather_selected_uuid');
        const found = userList.find((u) => u.uuid === savedUuid);
        if (found) {
          setSelectedUser(found);
        } else {
          // Default to first user (e.g. an attendee or organizer)
          setSelectedUser(userList[0]);
          localStorage.setItem('gather_selected_uuid', userList[0].uuid);
        }
      })
      .catch((err) => {
        if (alive) setError(`Could not load users: ${err.message}`);
      });

    return () => {
      alive = false;
    };
  }, []);

  // When selected user changes, load their registrations and open their profile
  useEffect(() => {
    if (!selectedUser?.uuid) return;
    let alive = true;

    fetchUserRegistrations(selectedUser.uuid)
      .then((regs) => {
        if (alive) setMyRegistrations(regs);
      })
      .catch((err) => {
        console.warn('Failed to load user registrations:', err.message);
      });

    return () => {
      alive = false;
    };
  }, [selectedUser?.uuid, refreshTrigger]);

  // Handle user selection from dropdown
  function handleSelectUser(user) {
    setSelectedUser(user);
    localStorage.setItem('gather_selected_uuid', user.uuid);
    setToast(`Active user: ${user.email}`);

    // Requirement: "So if I'll select any users, the profile of that user will be opened up."
    setProfileModalOpen(true);
  }

  // Load events
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchEvents(query);
        setEvents(data);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load events.');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, refreshTrigger]);

  // Handle event registration
  async function handleRegister(event) {
    if (!selectedUser) {
      setToast('Please select a user first.');
      return;
    }

    setRegisteringId(String(event.event_id));
    setError('');

    try {
      const newReg = await createRegistration(event.event_id, selectedUser.uuid);
      setToast(`✓ Registered ${selectedUser.email} for ${event.title}!`);

      // Optimistically add to myRegistrations so the button turns to "✓ Registered" immediately
      setMyRegistrations((prev) => {
        if (prev.some((r) => String(r.event_id) === String(event.event_id))) return prev;
        return [
          {
            id: newReg?.id || `reg-${Date.now()}`,
            student_id: selectedUser.uuid,
            event_id: event.event_id,
            created_at: new Date().toISOString(),
            event,
          },
          ...prev,
        ];
      });

      setRefreshTrigger((prev) => prev + 1);

      // If viewing in event dialog, refresh dialog view
      if (selectedEvent?.event_id === event.event_id) {
        setSelectedEvent({ ...event });
      }
    } catch (err) {
      setToast(err.message || 'Registration could not be completed.');
    } finally {
      setRegisteringId('');
    }
  }

  // Open event details dialog
  async function handleOpenEvent(event) {
    try {
      const full = await fetchEvent(event.event_id);
      setSelectedEvent(full);
    } catch {
      setSelectedEvent(event);
    }
  }

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Displayed events list based on active tab
  const displayedEvents = useMemo(() => {
    if (activeTab === 'mine') {
      return myRegistrations.map((r) => r.event).filter(Boolean);
    }
    return events;
  }, [activeTab, myRegistrations, events]);

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="site-header">
        <a href="#top" className="brand" aria-label="Gather home">
          <span className="brand-mark">
            <Icon name="spark" size={20} />
          </span>
          <span>
            gather<span className="brand-period">.</span>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Discover Events
          </button>
          <button
            className={`nav-link ${activeTab === 'mine' ? 'active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
            My Registrations {myRegistrations.length > 0 && `(${myRegistrations.length})`}
          </button>
          {selectedUser && (
            <button
              className="nav-link profile-nav-btn"
              onClick={() => setProfileModalOpen(true)}
            >
              <Icon name="user" size={14} /> Profile
            </button>
          )}
        </nav>

        {/* User Selection Dropdown in Top Header */}
        <div className="header-actions">
          <UserDropdown
            users={users}
            selectedUser={selectedUser}
            onSelectUser={handleSelectUser}
            onOpenProfile={(u) => {
              setSelectedUser(u);
              setProfileModalOpen(true);
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main id="top">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">
              <span className="eyebrow-line" />
              COMMUNITY EVENT REGISTRATION
            </div>
            <h1>
              Register for<br />
              <em>something good.</em>
            </h1>
            <p>
              Select any profile from the dropdown above to view their registrations and reserve a spot for upcoming
              events instantly.
            </p>

            <div className="hero-user-status">
              <span className="hero-status-label">ACTIVE PROFILE</span>
              <div className="hero-status-pill" onClick={() => setProfileModalOpen(true)}>
                <span className="avatar avatar-small">{initials(selectedUser?.email)}</span>
                <span className="hero-status-email">{selectedUser?.email || 'No user selected'}</span>
                {selectedUser && <RoleBadge role={selectedUser.role} />}
                <span className="hero-status-action">View Profile →</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="sun-shape" />
            <div className="hero-orbit orbit-a" />
            <div className="hero-orbit orbit-b" />
            <div className="hero-stamp">
              <Icon name="spark" size={34} />
              <span>
                NO SIGN-IN<br />NEEDED
              </span>
            </div>
            <div className="hero-note note-one">SELECT &amp; REGISTER</div>
            <div className="hero-note note-two">CAMPUS CONNECT</div>
            <div className="hero-shape shape-one" />
            <div className="hero-shape shape-two" />
          </div>

          <div className="hero-index">
            <span>01</span>
            <span className="index-line" />
            <span>INSTANT REGISTRATION SYSTEM</span>
          </div>
        </section>

        {/* Events Board */}
        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line" /> THE EVENT BOARD
              </p>
              <h2>{activeTab === 'mine' ? `${selectedUser?.email || 'Your'} Plans` : 'Find Your Event'}</h2>
              <p className="section-subtitle">
                {activeTab === 'mine'
                  ? `All events ${selectedUser?.email || 'you'} are currently registered for.`
                  : `Browse and register instantly as ${selectedUser?.email || 'the active user'}.`}
              </p>
            </div>

            <div className="section-count">
              <span className="count-number">{String(displayedEvents.length).padStart(2, '0')}</span>
              <span>{activeTab === 'mine' ? 'ON YOUR LIST' : 'EVENTS AVAILABLE'}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="view-toggle-pills">
                <button
                  className={`view-pill ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Events ({events.length})
                </button>
                <button
                  className={`view-pill ${activeTab === 'mine' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mine')}
                >
                  Registered ({myRegistrations.length})
                </button>
              </div>
            </div>

            <label className="search-box">
              <Icon name="search" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search event title…"
                aria-label="Search events"
              />
              {query && (
                <button className="clear-search-btn" onClick={() => setQuery('')}>
                  ×
                </button>
              )}
            </label>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => setRefreshTrigger((prev) => prev + 1)}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <span className="loader" />
              <p>Loading events…</p>
            </div>
          ) : displayedEvents.length > 0 ? (
            <div className="event-grid">
              {displayedEvents.map((event) => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  currentUser={selectedUser}
                  onOpen={handleOpenEvent}
                  onRegister={handleRegister}
                  registering={registeringId === String(event.event_id)}
                  isRegistered={registeredIds.has(String(event.event_id))}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <Icon name={activeTab === 'mine' ? 'ticket' : 'spark'} size={26} />
              </span>
              <h3>
                {activeTab === 'mine'
                  ? 'No registrations found'
                  : query
                  ? 'No events match your search'
                  : 'No events available right now'}
              </h3>
              <p>
                {activeTab === 'mine'
                  ? `${selectedUser?.email || 'You'} haven't registered for any events yet. Switch to "All Events" to register!`
                  : query
                  ? 'Try clearing the search query to see all events.'
                  : 'Check back soon for new events.'}
              </p>
              {activeTab === 'mine' && (
                <button className="button button-dark" onClick={() => setActiveTab('all')}>
                  Browse All Events <Icon name="arrow" size={14} />
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <a href="#top" className="brand footer-brand">
          <span className="brand-mark">
            <Icon name="spark" size={18} />
          </span>
          <span>
            gather<span className="brand-period">.</span>
          </span>
        </a>
        <span>Campus Connect Event Registration • Instant Profile Selection</span>
        <span className="footer-credit">CAMPUS CONNECT © {new Date().getFullYear()}</span>
      </footer>

      {/* User Profile Modal / Drawer */}
      {profileModalOpen && selectedUser && (
        <UserProfileModal
          user={selectedUser}
          registrations={myRegistrations}
          allEvents={events}
          onClose={() => setProfileModalOpen(false)}
          onOpenEvent={handleOpenEvent}
        />
      )}

      {/* Event Details Dialog */}
      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          currentUser={selectedUser}
          onClose={() => setSelectedEvent(null)}
          onRegister={handleRegister}
          registering={registeringId === String(selectedEvent.event_id)}
          isRegistered={registeredIds.has(String(selectedEvent.event_id))}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
