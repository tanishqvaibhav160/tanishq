import { createClient } from '@supabase/supabase-js';

const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://tanishq-92t4.onrender.com').replace(/\/$/, '');

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pbobxwbbuhblxdojekwb.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_gnsPC0X6tmkBDE3YdvjJvw_bHHmFaAH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const FALLBACK_USERS = [
  { uuid: 'f6aa333d-a1c8-5954-b268-86b4257003a5', email: 'maya.demo@example.invalid', role: 'organiser' },
  { uuid: '84291c94-c887-559e-b231-4d868cdb8929', email: 'arjun.demo@example.invalid', role: 'organiser' },
  { uuid: '069ec420-b3f8-5206-9eee-179f9183253a', email: 'leah.demo@example.invalid', role: 'organiser' },
  { uuid: '2e1bfce2-9204-5659-b776-032f59f1b0f6', email: 'noah.demo@example.invalid', role: 'attendee' },
  { uuid: '9f9a16d4-1e9f-5ccc-8ec1-0927ff27d4ab', email: 'isha.demo@example.invalid', role: 'attendee' },
  { uuid: '257c41c3-f1ad-59ed-869b-0f6d4ab962d7', email: 'omar.demo@example.invalid', role: 'attendee' },
  { uuid: '0d14cdaa-bdff-5670-8c81-f5dee3342e8c', email: 'ava.demo@example.invalid', role: 'attendee' },
  { uuid: '60bfffd0-236f-5c4e-999d-3777e639b226', email: 'liam.demo@example.invalid', role: 'attendee' },
  { uuid: '1293fbeb-3924-5ad1-8bb6-5e2ba344929d', email: 'zara.demo@example.invalid', role: 'attendee' },
  { uuid: 'd8d66d61-9ba6-58ed-bdee-a3143d57e657', email: 'ethan.demo@example.invalid', role: 'attendee' },
  { uuid: 'bc749cd9-cd5c-5c99-b787-7c60a1fa4c0a', email: 'priya.demo@example.invalid', role: 'attendee' },
  { uuid: 'f8134f80-95d4-53fb-a796-e217dc9847c0', email: 'lucas.demo@example.invalid', role: 'attendee' },
];

/**
 * Generic API fetcher that talks to the backend
 */
export async function apiRequest(path, { userId, ...options } = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(userId ? { 'X-User-Id': userId } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = payload.error || `Request failed (${response.status})`;
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }
  return payload;
}

/**
 * Fetch all users (from backend /api/users with fallback to Supabase)
 */
export async function fetchUsers() {
  try {
    const res = await apiRequest('/api/users');
    if (res?.data && res.data.length > 0) return res.data;
  } catch (err) {
    console.warn('Backend /api/users unavailable, querying Supabase directly:', err.message);
  }

  try {
    const { data, error } = await supabase.from('users').select('uuid, email, role').order('email');
    if (!error && data && data.length > 0) return data;
  } catch (sbErr) {
    console.warn('Supabase fetch users failed:', sbErr.message);
  }

  return FALLBACK_USERS;
}

/**
 * Fetch events (from backend /api/events with fallback to Supabase)
 */
export async function fetchEvents(query = '') {
  try {
    const params = new URLSearchParams({ limit: '50', offset: '0' });
    if (query.trim()) params.set('q', query.trim());
    const res = await apiRequest(`/api/events?${params}`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend /api/events failed, using Supabase:', err.message);
  }

  let dbQuery = supabase.from('events').select('*').order('created_at', { ascending: false });
  if (query.trim()) {
    dbQuery = dbQuery.ilike('title', `%${query.trim()}%`);
  }
  const { data, error } = await dbQuery;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch event details
 */
export async function fetchEvent(eventId) {
  try {
    const res = await apiRequest(`/api/events/${encodeURIComponent(eventId)}`);
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend /api/events/:id failed, trying Supabase:', err.message);
  }

  const { data, error } = await supabase.from('events').select('*').eq('event_id', eventId).maybeSingle();
  if (error || !data) throw new Error('Event not found.');
  return data;
}

/**
 * Register student for an event
 */
export async function createRegistration(eventId, studentId) {
  if (!eventId || !studentId) {
    throw new Error('Event ID and Student ID are required.');
  }

  // 1. Check if already registered in Supabase
  try {
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('student_id', studentId)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('You are already registered for this event.');
    }
  } catch (checkErr) {
    if (checkErr.message.includes('already registered')) throw checkErr;
  }

  // 2. Try registering via backend API
  try {
    const res = await apiRequest('/api/registrations', {
      method: 'POST',
      userId: studentId,
      body: JSON.stringify({ event_id: eventId, student_id: studentId }),
    });
    if (res?.data) return res.data;
  } catch (err) {
    if (err.status === 409 || err.message.toLowerCase().includes('already registered')) {
      throw new Error('You are already registered for this event.');
    }
    console.warn('Backend API registration returned error, falling back to direct Supabase insert:', err.message);
  }

  // 3. Direct Supabase insert fallback
  const { data, error } = await supabase
    .from('registrations')
    .insert({ event_id: eventId, student_id: studentId })
    .select();

  if (error) {
    if (
      error.code === '23505' ||
      error.message.toLowerCase().includes('already registered') ||
      error.message.toLowerCase().includes('duplicate') ||
      error.message.toLowerCase().includes('unique')
    ) {
      throw new Error('You are already registered for this event.');
    }
    throw new Error(error.message || 'Registration failed.');
  }

  return data?.[0] || { event_id: eventId, student_id: studentId };
}

/**
 * Fetch student's registrations
 */
export async function fetchUserRegistrations(studentId) {
  if (!studentId) return [];

  try {
    const res = await apiRequest(`/api/me/registrations?student_id=${encodeURIComponent(studentId)}`, {
      userId: studentId,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend /api/me/registrations unavailable, querying Supabase directly:', err.message);
  }

  // Supabase fallback
  const { data: registrations, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const eventIds = [...new Set((registrations || []).map((r) => r.event_id).filter(Boolean))];
  let eventsMap = {};
  if (eventIds.length > 0) {
    const { data: events } = await supabase.from('events').select('*').in('event_id', eventIds);
    if (events) {
      eventsMap = Object.fromEntries(events.map((e) => [String(e.event_id), e]));
    }
  }

  return (registrations || []).map((reg) => ({
    ...reg,
    event: eventsMap[String(reg.event_id)] || null,
  }));
}

/**
 * Fetch event attendees for event organizer
 */
export async function fetchEventAttendees(eventId, organizerId) {
  try {
    const res = await apiRequest(`/api/events/${encodeURIComponent(eventId)}/registrations`, {
      userId: organizerId,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn('Backend attendee list endpoint failed, querying Supabase directly:', err.message);
  }

  // Supabase fallback
  const { data: registrations, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');

  if (error) throw new Error(error.message);

  const studentIds = [...new Set((registrations || []).map((r) => r.student_id).filter(Boolean))];
  let usersMap = {};
  if (studentIds.length > 0) {
    const { data: users } = await supabase.from('users').select('uuid, email, role').in('uuid', studentIds);
    if (users) {
      usersMap = Object.fromEntries(users.map((u) => [String(u.uuid), u]));
    }
  }

  return (registrations || []).map((reg) => ({
    ...reg,
    user: usersMap[String(reg.student_id)] || null,
  }));
}
