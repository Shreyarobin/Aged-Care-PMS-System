import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./layouts/ProtectedRoute";
import StaffLayout from "./layouts/StaffLayout";
import ResidentOverview from "./pages/ResidentOverview";
import ResidentLayout from "./layouts/ResidentLayout";
import ResidentSummary from "./pages/ResidentSummary";
import CarePlanTab from "./pages/CarePlanTab";
import VitalsTab from "./pages/VitalsTab";
import NotesTab from "./pages/NotesTab";
import MedicationsTab from "./pages/MedicationsTab";
import FamilyLayout from "./layouts/FamilyLayout";
import FamilyResidentView from "./pages/FamilyResidentView";
import AddResidentForm from "./pages/AddResidentForm";
import EditResidentForm from "./pages/EditResidentForm";
import InterRAITab from "./pages/InterRAITab";
import MessagesPage from "./pages/MessagesPage";
import IncidentsTab from "./pages/IncidentsTab";
import CareAssistPage from "./pages/CareAssistPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import StaffRoster from "./pages/StaffRoster";
import ComplianceOverview from "./pages/ComplianceOverview";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<div style={{ padding: "40px" }}>You don't have access to this page.</div>} />

      <Route path="/family" element={<ProtectedRoute allowedRoles={["family"]} />}>
        <Route element={<FamilyLayout />}>
          <Route index element={<FamilyResidentView />} />
        </Route>
      </Route>

      <Route path="/*" element={<ProtectedRoute allowedRoles={["nurse", "clinician", "manager"]} />}>
        <Route element={<StaffLayout />}>
          <Route path="" element={<ResidentOverview />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="roster" element={<StaffRoster />} />
          <Route path="compliance" element={<ComplianceOverview />} />
          <Route path="residents/new" element={<AddResidentForm />} />
          <Route path="residents/:id" element={<ResidentLayout />}>
          <Route path="interrai" element={<InterRAITab />} />
          <Route path="incidents" element={<IncidentsTab />} />
          <Route path="edit" element={<EditResidentForm />} />
            <Route index element={<ResidentSummary />} />
            <Route path="care-plan" element={<CarePlanTab />} />
            <Route path="vitals" element={<VitalsTab />} />
            <Route path="notes" element={<NotesTab />} />
            <Route path="medications" element={<MedicationsTab />} />
            <Route path="careassist" element={<CareAssistPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;