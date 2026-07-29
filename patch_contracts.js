const fs = require('fs');
let content = fs.readFileSync('/Users/nguyen/TroHub_Local_UI_Update/screens/AdminContractsScreen.tsx', 'utf-8');

// Imports
content = content.replace(
  'import ProgressStepper from "../components/ui/ProgressStepper";',
  'import ProgressStepper from "../components/ui/ProgressStepper";\nimport { draftContractService, DraftContract } from "../services/draftContractService";\nimport CheckoutModal from "../components/modals/CheckoutModal";'
);

// Filter type
content = content.replace(
  'const [filter, setFilter] = useState<"all" | "pending" | "active">("all");',
  'const [filter, setFilter] = useState<"all" | "pending" | "active" | "checkout" | "draft">("all");\n  const [drafts, setDrafts] = useState<DraftContract[]>([]);\n  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);\n  const [checkoutContractId, setCheckoutContractId] = useState("");\n  const [checkoutLoading, setCheckoutLoading] = useState(false);'
);

// loadData to also load drafts
content = content.replace(
  'const contractsRes = await adminService.getContracts();',
  'const contractsRes = await adminService.getContracts();\n      const draftsRes = await draftContractService.getDrafts();\n      setDrafts(draftsRes);'
);

// closeWizard to save draft
const closeWizardReplacement = `
  const closeWizard = async () => {
    if (selectedRoomId || selectedTenantId) {
      await draftContractService.saveDraft({
        roomId: selectedRoomId,
        tenantId: selectedTenantId,
        startDate,
        endDate,
        fixedRentPrice: fixedRent,
        fixedDeposit,
        initialElectricity,
        initialWater,
        step: currentStep,
      });
      loadData();
    }
    setModalVisible(false);
    setSelectedRoomId("");
    setSelectedTenantId("");
    setCurrentStep(1);
    setConfirmed(false);
  };
`;
content = content.replace(
  /const closeWizard = \(\) => {[\s\S]*?};/,
  closeWizardReplacement.trim()
);

// Filter tabs
content = content.replace(
  '<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>',
  '<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>\n                {filterButton("draft", "Bản nháp")}\n                {filterButton("checkout", "Trả phòng")}'
);

fs.writeFileSync('/Users/nguyen/TroHub_Local_UI_Update/screens/AdminContractsScreen.tsx', content);
