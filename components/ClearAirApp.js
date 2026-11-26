"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const events = [
  ["Nov 21, 2026", "Neighbourhood Air Sensor Walk", "Pune", "Meetup", "Volunteers mapped PM2.5 along school routes and shared a simple hotspot map."],
  ["Nov 14, 2026", "Cleaner Kitchens Workshop", "Nagpur", "Workshop", "Switching from biomass to LPG or induction: costs, subsidies and indoor smoke savings."],
  ["Nov 8, 2026", "No-Burn Diwali Aftermath Clinic", "Delhi", "Drive", "Residents swapped leaf and waste burning for composting pickups."],
  ["Oct 30, 2026", "Masks That Work: N95 Fit Session", "Mumbai", "Workshop", "Hands-on fit testing and what cloth and surgical masks can and cannot do."],
  ["Oct 24, 2026", "Carpool and Metro Challenge", "Pune", "Drive", "Two weeks of shared commutes with a live count of avoided car trips."],
  ["Oct 17, 2026", "Schools Air Quality Assembly", "Mumbai", "Meetup", "Students learned to read an AQI app and plan indoor activity days."],
  ["Oct 9, 2026", "DIY Box-Fan Filter Build Day", "Nagpur", "Workshop", "Families built low-cost air cleaners and compared them with HEPA units."],
  ["Oct 2, 2026", "Housing Society Clean Air Pledge", "Delhi", "Meetup", "Societies agreed to ban waste burning and set up a shared clean-air room."]
];

const filters = ["All", "Workshop", "Drive", "Meetup"];
const initialProfile = { city: "Pune", commute: "Two-wheeler", cooking: "LPG", heating: "None / blankets", airCleaning: "None", household: "Adults only", pm25: 35 };

function fallbackPlan(profile) {
  const daily = [{ action: "Check your official local AQI before planning strenuous outdoor activity.", why: "This entry is not live and cannot tell you current conditions.", impact: "Choose a lower-pollution time or indoor option when advisories recommend it." }];
  if (["Two-wheeler", "Walk / cycle"].includes(profile.commute)) daily.push({ action: "When practical, choose a lower-traffic route or share a ride.", why: "Roadside traffic can add to near-road exposure; walking routes and options vary.", impact: "Fewer solo car trips also reduce per-person transport emissions." });
  const indoor = [{ action: profile.airCleaning === "HEPA purifier" ? "Run a correctly sized HEPA purifier in one occupied room." : "Create one cleaner room; reduce smoke and manage doors and windows during outdoor pollution events.", why: "Cleaner air in a frequently used room can reduce indoor particle exposure; results depend on the home and device.", impact: "Potentially lower indoor particles; no fixed reduction can be promised." }, { action: "Damp-wipe surfaces and mop rather than dry-sweep.", why: "This can reduce dust being stirred back into the air.", impact: "Less resuspended household dust." }];
  const swaps = [];
  if (profile.cooking.startsWith("Wood")) swaps.push({ action: "Explore a cleaner cooking option that is affordable and reliably available.", why: "Solid-fuel cooking can create substantial smoke indoors.", impact: "Avoiding combustion reduces one household smoke source." });
  if (profile.heating.startsWith("Burning")) swaps.push({ action: "Avoid burning waste or unvented solid fuel indoors; use safer warmth options where available.", why: "Combustion smoke adds particles and other pollutants.", impact: "Removes that activity as an indoor pollution source." });
  swaps.push({ action: "Coordinate a no-burn request, shared rides, or a cleaner-air room with neighbours.", why: "Community changes can help people who cannot buy equipment.", impact: "Shared action can reduce local emissions and improve access to cleaner indoor space." });
  return { summary: `Plan for ${profile.city}, based on a user-entered PM2.5 value of ${profile.pm25} µg/m³. It is not a live reading or a medical assessment; follow local advisories.`, sections: [{ title: "Daily routine", items: daily }, { title: "Indoor air", items: indoor }, { title: "Sustainable swaps", items: swaps }] };
}

function offlineAnswer(question, profile) {
  const text = question.toLowerCase();
  if (/outside|play|exercise|school|walk/.test(text)) return `I can’t assess current safety from the entered value (${profile.pm25} µg/m³), which may not represent today’s conditions. Check your official local AQI and health advisory; when pollution is elevated, reduce strenuous outdoor time, especially for children and sensitive household members.`;
  if (/indoor|bedroom|window|purifier|filter/.test(text)) return "Choose one frequently used room, reduce indoor smoke, and use a correctly sized HEPA purifier if available. Keep outdoor air out during pollution episodes when practical, then ventilate when local conditions improve. Results depend on the home and device.";
  return "I’m offline, so I can’t give a tailored AI answer right now. Check the household plan above and your official local AQI; advice here is general, not medical care.";
}

async function requestAssistant(payload) {
  const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Assistant unavailable");
  return response.json();
}

function Field({ id, label, value, options, onChange }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{options ? <Select value={value} onValueChange={onChange}><SelectTrigger id={id} aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : <Input id={id} value={value} maxLength={80} onChange={event => onChange(event.target.value)} />}</div>;
}

function Plan({ plan }) {
  if (!plan) return null;
  return <div className="plan-output"><p className="plan-summary"><strong>{plan.summary}</strong></p>{(plan.sections || []).map(section => <section className="plan-section" key={section.title}><h3>{section.title}</h3>{(section.items || []).map((item, index) => <article className="plan-item" key={`${section.title}-${index}`}><strong>{item.action}</strong><p>{item.why}</p>{item.impact && <span className="impact">Impact · {item.impact}</span>}</article>)}</section>)}</div>;
}

export default function ClearAirApp() {
  const { user, configured, signOutUser } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState("");
  const [planBusy, setPlanBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const updateProfile = (key, value) => setProfile(current => ({ ...current, [key]: value }));

  async function buildPlan(event) {
    event.preventDefault();
    if (planBusy) return;
    setPlanBusy(true);
    setPlanStatus("Preparing your plan…");
    try {
      const result = await requestAssistant({ action: "plan", profile });
      setPlan(result.plan);
      setPlanStatus("AI-assisted plan. Check local advisories; suggestions are general.");
    } catch {
      setPlan(fallbackPlan(profile));
      setPlanStatus("AI is unavailable; showing an offline plan. Verify current conditions with official local guidance.");
    } finally {
      setPlanBusy(false);
    }
  }

  async function askAssistant(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || chatBusy) return;
    const history = messages.slice(-6);
    setMessages(current => [...current, { role: "user", content: text }]);
    setQuestion("");
    setChatBusy(true);
    try {
      const result = await requestAssistant({ action: "ask", profile, question: text, history });
      setMessages(current => [...current, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", content: offlineAnswer(text, profile) }]);
    } finally {
      setChatBusy(false);
    }
  }

  const visibleEvents = events.filter(event => (filter === "All" || event[3] === filter) && event.join(" ").toLowerCase().includes(search.toLowerCase()));
  const facts = [["PM2.5", `${profile.pm25} µg/m³ is the value you entered; check its source and averaging period.`], ["15 µg/m³", "WHO 24-hour guideline; compare only with a 24-hour mean."], ["Not live", "No monitor is connected. Check official local air-quality updates."], ["General", "Advice here cannot assess individual symptoms or medical risk."]];

  return <>
    <div className="announcement">Winter air brief · practical steps for cleaner days</div>
    <header className="site-header"><div className="wrap nav">
      <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Clear Air</Link>
      <nav className="nav-links" aria-label="Main navigation"><a href="#upcoming">Events</a><a href="#assistant">Smog assistant</a><a href="#past">Archive</a></nav>
      <span className="spacer" />
      <div className="nav-actions">{user ? <><span className="text-link">{user.displayName || user.email}</span><button className="button" onClick={signOutUser}>Sign out</button></> : <><Link className="text-link" href="/login">Sign in</Link><Link className="button primary" href="/signup">Create account</Link></>}{!configured && user && <span className="note">Firebase not configured</span>}</div>
    </div></header>

    <main id="top">
      <div className="wrap hero">
        <p className="tag">Urban air quality · Winter smog season</p>
        <h1>A clearer plan for <em>smog days</em></h1>
        <p className="lead">Build a practical routine for your household, understand which changes matter, and find local people working toward cleaner air.</p>
        <a className="button primary" href="#assistant">Create my air plan ↓</a>
        <div className="stats"><div><b>01</b><span>your household</span></div><div><b>02</b><span>daily choices</span></div><div><b>03</b><span>shared action</span></div></div>
      </div>

      <section className="section" id="assistant"><div className="wrap">
        <p className="tag">Smog assistant</p><h2>Your personal smog plan</h2>
        <Card className="panel assistant-card">
          <p className="disclaimer">Use a recent reading from a local monitor or official AQI service. This tool does not fetch live air-quality data; its advice is general and not medical care.</p>
          <form onSubmit={buildPlan}>
            <div className="profile-grid">
              <Field id="city" label="City" value={profile.city} onChange={value => updateProfile("city", value)} />
              <Field id="commute" label="Commute" value={profile.commute} options={["Two-wheeler", "Car", "Bus / shared transport", "Metro / train", "Walk / cycle", "Work from home"]} onChange={value => updateProfile("commute", value)} />
              <Field id="cook" label="Cooking fuel" value={profile.cooking} options={["LPG", "Induction / electric", "Wood / biomass / coal"]} onChange={value => updateProfile("cooking", value)} />
              <Field id="heat" label="Winter heating" value={profile.heating} options={["None / blankets", "Electric heater", "Burning wood, coal or waste"]} onChange={value => updateProfile("heating", value)} />
              <Field id="home" label="Home air cleaning" value={profile.airCleaning} options={["None", "HEPA purifier", "Fan / AC only"]} onChange={value => updateProfile("airCleaning", value)} />
              <Field id="who" label="Household" value={profile.household} options={["Adults only", "Children under 12", "Elderly members", "Someone with breathing sensitivity"]} onChange={value => updateProfile("household", value)} />
            </div>
            <div className="range-field"><label className="field-label" id="pm-label">PM2.5 reading or estimate (µg/m³)</label><Slider aria-labelledby="pm-label" aria-describedby="pm-help" min={5} max={500} step={1} value={[profile.pm25]} onValueChange={value => updateProfile("pm25", value[0])} /><p className="note" id="pm-help">Example value only. PM2.5 concentration is not the same as AQI.</p></div>
            <div className="meter"><span className="pm-value">{profile.pm25}</span><Badge>User entry</Badge></div>
            <div className="facts">{facts.map(([title, detail]) => <Card className="fact" key={title}><strong>{title}</strong>{detail}</Card>)}</div>
            <Button className="assistant-action" variant="primary" type="submit" disabled={planBusy}>{planBusy ? "Building…" : plan ? "Rebuild my plan" : "Build my plan"}</Button>
          </form>
          <p className="status" role="status" aria-live="polite">{planStatus}</p>
          <Plan plan={plan} />
          <hr className="divider" />
          <h3>Ask a follow-up</h3>
          <div className="chat" role="log" aria-label="Assistant conversation" aria-live="polite">{messages.map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}{chatBusy && <div className="message assistant">Thinking…</div>}</div>
          <form className="question-form" onSubmit={askAssistant}><div className="field"><label htmlFor="question">Your question</label><Input className="question-input" id="question" maxLength={1200} value={question} onChange={event => setQuestion(event.target.value)} placeholder="How can we keep our bedroom air cleaner?" /></div><Button className="assistant-action" variant="primary" type="submit" disabled={chatBusy || !question.trim()}>{chatBusy ? "Sending…" : "Ask"}</Button></form>
          <p className="note">General information only. Follow local health advisories; seek medical care for symptoms or urgent concerns.</p>
          <p className="note">When AI is configured, your profile, question, and up to six recent chat messages are sent to the AI provider. This app does not save them. Avoid names and sensitive medical details.</p>
        </Card>
      </div></section>

      <section className="section" id="upcoming"><div className="wrap">
        <p className="tag">Together, locally</p><h2>Upcoming community events</h2>
        <div className="cards">
          <a className="event-card" href="#assistant"><span className="event-date">Dec 6, 2026</span><h3>Smog-Proof Your Home: Purifier &amp; DIY Filter Clinic</h3><span className="event-location">Pune, Maharashtra · Workshop</span><span className="event-cta">Event details →</span></a>
          <a className="event-card" href="#assistant"><span className="event-date">Dec 13, 2026</span><h3>Schools Clean Air Drive: Walk, Pool, Breathe</h3><span className="event-location">Mumbai, Maharashtra · Community</span><span className="event-cta">Event details →</span></a>
        </div>
        <p className="note">Sample listings. Confirm dates and registration with event organizers.</p>
      </div></section>

      <section className="section" id="past"><div className="wrap">
        <p className="tag">Community archive</p><h2>Past events</h2>
        <div className="filters" role="group" aria-label="Filter past events">{filters.map(option => <button className="filter-button" type="button" key={option} aria-pressed={filter === option} onClick={() => setFilter(option)}>{option}</button>)}<input className="event-search" aria-label="Search past events" placeholder="Search events" value={search} onChange={event => setSearch(event.target.value)} /></div>
        <div className="table-wrap"><table className="events-table"><thead><tr><th>Date</th><th>Event</th><th>Location</th><th>Description</th></tr></thead><tbody>{visibleEvents.length ? visibleEvents.map(event => <tr key={event[1]}><td data-label="Date">{event[0]}</td><td data-label="Event">{event[1]}<span className="event-kind">{event[3]}</span></td><td data-label="Location">{event[2]}</td><td data-label="Description">{event[4]}</td></tr>) : <tr><td colSpan="4">No events match.</td></tr>}</tbody></table></div>
      </div></section>
    </main>
    <footer className="site-footer"><div className="wrap">Clear Air · A community project for cleaner winters. Event listings are samples.</div></footer>
  </>;
}