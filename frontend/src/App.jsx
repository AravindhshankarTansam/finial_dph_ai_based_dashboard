import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GlobalLoader from './components/Loader/GlobalLoader';
import ChlInspectionPlanTable from './components/Chlorination/Chl_Dashboard/UpcomingInspectionPlan';
// import HISupervisionTable from './components/Dashboard/HiSupervisionTable';

// Lazy-loaded Components
const LoginForm = React.lazy(() => import('./components/Authentication/Login'));
const ForgetPassword = React.lazy(() => import('./components/Authentication/ForgetPassword'));

const Mos_Dashboard = React.lazy(() => import('./components/Dashboard/Dashboard'));
const State = React.lazy(() => import('./components/Dashboard/State'));
const StateData = React.lazy(() => import('./components/Dashboard/StateData'));
const CorpUser = React.lazy(() => import('./components/Dashboard/CorpUser'));
const HiSupervision = React.lazy(() => import('./components/Dashboard/HiSupervisionTable'));
const MosDistrictMasterTable = React.lazy(() => import('./components/Dashboard/mos_dist_master'));
const MosCorporationMasterTable = React.lazy(() => import('./components/Dashboard/CorpMasterTable'));
const DistUserStats = React.lazy(() => import('./components/Dashboard/District_User_Dashboard/DistAddUser'));
const DistStateData = React.lazy(() => import('./components/Dashboard/District_User_Dashboard/distDataCollection'));

const MosDist_Dashboard = React.lazy(() => import('./components/Dashboard/District_User_Dashboard/Dashboard'));
const MosBlockMasterTable = React.lazy(() => import('./components/Dashboard/District_User_Dashboard/DistBlockuser_Mastertable'));

const MosBlock_Dashboard = React.lazy(() => import('./components/Dashboard/Block_userDashboard/Dashboard'));
const BlockOfficerAdd = React.lazy(() => import('./components/Dashboard/Block_userDashboard/blocktestCollectors'));
const BlockUserTable = React.lazy(() => import('./components/Dashboard/Block_userDashboard/blockDataCollection'));

const Corp_Dashboard = React.lazy(() => import('./components/Dashboard/Corporation_Dashboard/Dashboard'));
const CorpUserStats = React.lazy(() => import('./components/Dashboard/Corporation_Dashboard/CorpAddUser'));
const CorpUserTable = React.lazy(() => import('./components/Dashboard/Corporation_Dashboard/CorpDataCollection'));
const MosMunicipalityMasterTable = React.lazy(() => import('./components/Dashboard/Corporation_Dashboard/MunicipalityMasterTable'));
const MosMunicipalityUserStats = React.lazy(() => import('./components/Dashboard/Corporation_Dashboard/MunicipalityMasterUser'));

const Mun_Dashboard = React.lazy(() => import('./components/Dashboard/Municipality_Dashboard/Dashboard'));
const MunUserStats = React.lazy(() => import('./components/Dashboard/Municipality_Dashboard/MunAddUser'));
const MunUserTable = React.lazy(() => import('./components/Dashboard/Municipality_Dashboard/MunDataCollection'));

const ChlorinationDashboard = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/ChlorinationDashboard'));
const ChlorinationStateData = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/DataCollection'));
const ChlorinationUser = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/ChlorinationUser'));
const HubDistrictMaster = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/ChlorinationStateMaster'));
const ChlHudStateData = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/HudDatacollection'));
const ChlHudVillageMasterView = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/hudVillageOverview'));
const HudMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/HUD/HudMasterTable'));
const HudUserTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/HUD/HudUser'));
const HudBlockMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/HUD/hudBlockMasterTable'));
const ChlhubHudVillageMasterView = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/HUD/hudVillageOverview'));
const AdminProfile = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/AdminProfile'));
const StateInspectionPlanTable = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/UpcomingInspectionPlan'));
const HolidayTable = React.lazy(() => import('./components/Chlorination/Chl_Dashboard/GovtHolidays'));

const HubDashboard = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hubDashboard'));
const HubStateData = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hubDataCollection'));
const HubUser = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hubUser'));
const HubOfficerAdd = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hub_officer_add'));
const InspectionPlanTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/UpcomingInspectionPlan'));
const HubSummaryTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/UpcominInspectionSummary'));
const HubBlockTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hubMasterTable'));
const CorporationMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/hubCorporationMasterTable'));
const GovernmentHospitalsMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/GovtHospitalMasterTable'));
const EducationalInstitutionsMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/EducationalInstitutionsMasterTable'));
const GovernmentInstitutionsMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/GovtInstMasterTable'));
const PrisonMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/PrisonMasterTable'));
const ApprovedHomesMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/ApprovedHomesMasterTable'));
const TownPanchayatsMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/TownsMasterTable'));
const MunicipalitiesMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/MunicipalitiesMasterTable'));
const RailwayStationsMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/RailwayStationMasterTable'));
const PWDMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/PWDMasterTable'));
const TempleFestivalMasterTable = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/TemplesMasterTable'));
const ChlhubHudStateData = React.lazy(() => import('./components/Chlorination/Hub_Dashboard/HUD/hubHudDataCollection'));

const Hud_Dashboard = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/Dashboard'));
const HudVillageMasterTable = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/HudVillageMasterTable'));
const HudStateData = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/HudDatacollection'));
const BlockMasterTable = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/hudBlockMasterTable'));
const ChlHudBlockUserTable = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/BlockOfficerAdd'));
const VillageOfficerAdd = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/hudDataCollector'));
const HudVillageMasterView = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/HudVillageMasterView'));
const VillageHamlet = React.lazy(() => import('./components/Chlorination/HUD_Dashboard/VillageHamlet'));

const Hud_Block_Dashboard = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/Dashboard'));
const BlkVillageMasterView = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/Block_village_master_view'));
const BlkVillageOfficerAdd = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/hudBlockDataCollector'));
const BlkVillageMasterTable = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/BlkVillageMasterTable'));
const BlkVillageHamlet = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/VillageHamlet'));
const BlkHudStateData = React.lazy(() => import('./components/Chlorination/Chl_Block_Dashboard/BlkDatacollection'));

function App() {
  return (
    <Router>
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/" element={<LoginForm />} />
          <Route path="/forgetpass" element={<ForgetPassword />} />

          {/* Mosquito Admin */}
          <Route path="/mosquito-admin-dashboard" element={<Mos_Dashboard />} />
          <Route path="/state" element={<State />} />
          <Route path="/data" element={<StateData />} />
          {/* <Route path="/hi-supervision" element={<HISupervisionTable/>} /> */}
          <Route path="/mos-district-master-table" element={<MosDistrictMasterTable />} />
          <Route path="/mos-corp-master-table" element={<MosCorporationMasterTable />} />
          <Route path="/corporation-user" element={<CorpUser />} />
          <Route path="/mosquito-district-dashboard" element={<MosDist_Dashboard />} />
          <Route path="/mosquito-district-data" element={<DistStateData />} />
          <Route path="/mosquito-district-user" element={<DistUserStats />} />
          <Route path="/mosquito-district-block-master-table" element={<MosBlockMasterTable />} />

          {/* Corporation Dashboard under Mosquito Role */}
          <Route path="/corp_dashboard" element={<Corp_Dashboard />} />
          <Route path="/mosquito-corp-users" element={<CorpUserStats />} />
          <Route path="/mosquito-corp-data" element={<CorpUserTable />} />
          <Route path="/mosquito-corp-municipality-master-table" element={<MosMunicipalityMasterTable />} />
           <Route path='/mosquito-municipality-master-user' element={<MosMunicipalityUserStats />} />

           {/* Municipality Dashboard under Mosquito Role */}
          <Route path="/mun_dashboard" element={<Mun_Dashboard />} />
          <Route path="/mosquito-mun-users" element={<MunUserStats />} />
          <Route path="/mosquito-mun-data" element={<MunUserTable />} />

          {/* Mosquito Block Dashboard under Mosquito role */}
          <Route path="/block-dashboard" element={<MosBlock_Dashboard />} />
          <Route path="/block-users" element={<BlockOfficerAdd />} />
          <Route path="/block-data" element={<BlockUserTable />} />

          {/* Chlorination Admin */}
          <Route path="/chl-admin-dashboard" element={<ChlorinationDashboard />} />
          <Route path="/chlorination-state" element={<ChlorinationUser />} />
          <Route path="/chlorination-HUB-district-master-table" element={<HubDistrictMaster />} />
          <Route path="/chlorination-data" element={<ChlorinationStateData />} />
          <Route path="/chlorination-user" element={<ChlorinationUser />} />
          <Route path="/chlorination-holidays" element={<HolidayTable />} />
          <Route path="/inspection-data" element={<StateInspectionPlanTable/>} />
          <Route path="/hud-village-data" element={<ChlHudVillageMasterView />} />
          <Route path="/hud-village-data" element={<ChlHudVillageMasterView />} />
          <Route path="/hud-table" element={<HudMasterTable />} />
          <Route path="/hud-user" element={<HudUserTable />} />
          <Route path='/chl-hud-data' element={<ChlHudStateData />} />
          <Route path="/hud-block-master-table" element={<HudBlockMasterTable />} />
           <Route path="/hud-village" element={<ChlhubHudVillageMasterView />} />
          <Route path="/edit-user" element={<AdminProfile />} />
         

          {/* Chlorination Regional(Hub) Data under role Chlorine */}
          <Route path="/hub-dashboard" element={<HubDashboard />} />
          <Route path="/hub-data" element={<HubStateData />} />
          <Route path="/hub-user" element={<HubUser />} />
          <Route path="/inspection-plan" element={<InspectionPlanTable/>} />
          <Route path="/inspection-summary" element={<HubSummaryTable/>} />
          <Route path="/hub-block" element={<HubBlockTable />} />
          <Route path="/hub-corporation-master-table" element={<CorporationMasterTable />} />
          <Route path="/hub-hospitals-master-table" element={<GovernmentHospitalsMasterTable />} />
          <Route path="/hub-educational-institutions-master-table" element={<EducationalInstitutionsMasterTable />} />
          <Route path="/hub-government-institutions-master-table" element={<GovernmentInstitutionsMasterTable />} />
          <Route path="/hub-prison-master-table" element={<PrisonMasterTable />} />
          <Route path="/hub-approved-homes-master-table" element={<ApprovedHomesMasterTable />} />
          <Route path="/hub-towns-master-table" element={<TownPanchayatsMasterTable />} />
          <Route path="/hub-municipalities-master-table" element={<MunicipalitiesMasterTable />} />
          <Route path="/hub-railway-stations-master-table" element={<RailwayStationsMasterTable />} />
          <Route path="/hub-pwd-master-table" element={<PWDMasterTable />} />
          <Route path="/hub-temple-festival-master-table" element={<TempleFestivalMasterTable />} />
          <Route path="/add_user" element={<HubOfficerAdd />} />
          <Route path="/hud-chl-monitoring" element={<ChlhubHudStateData/>} />

          {/* HUD(District) Dashboard under role Chlorine */}
          <Route path="/hud-admin-dashboard" element={<Hud_Dashboard />} />  
          <Route path="/hud-collector-add" element={<VillageOfficerAdd />} />
          <Route path="/hud-data" element={<HudStateData />} />
          <Route path="/hud-block-table" element={<BlockMasterTable />} />
          <Route path="/hud-block-user" element={<ChlHudBlockUserTable/>} />
          <Route path="/hud-village-master-table" element={<HudVillageMasterTable />} />
          <Route path="/hud-master-view" element={<HudVillageMasterView />} />
          <Route path="/hud-hamlet" element={<VillageHamlet/>} />

          <Route path="/hud-block-dashboard" element={<Hud_Block_Dashboard />} />
          <Route path="/block-village-master-table" element={<BlkVillageMasterTable />} /> 
          <Route path="/hud-block-village" element={<BlkVillageMasterView/>} />
          <Route path="/hud-collector-view" element={<BlkVillageOfficerAdd/>} />
          <Route path="/block-hamlet" element={<BlkVillageHamlet/>} />
          <Route path="/hud-block-data" element={<BlkHudStateData />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
