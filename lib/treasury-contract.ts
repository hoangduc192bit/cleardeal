import { isAddress, parseAbi, type Address } from "viem";

export const clearDealTreasuryAbi = parseAbi([
  "function createExpense(address manager,address finance,address vendor,uint256 approvedBudget,bytes32 metadataHash,bytes32 memoId) returns (uint256 expenseId)",
  "function managerDecision(uint256 expenseId,bool approved)",
  "function submitEvidence(uint256 expenseId,bytes32 evidenceHash,uint256 payoutAmount)",
  "function rejectByFinance(uint256 expenseId)",
  "function cancelExpense(uint256 expenseId)",
  "function payExpense(uint256 expenseId)",
  "function roleExpenseCount(address account) view returns (uint256)",
  "function getExpenseIds(address account,uint256 offset,uint256 limit) view returns (uint256[] result)",
  "function expenses(uint256 expenseId) view returns (address requester,address manager,address finance,address vendor,bytes32 metadataHash,bytes32 evidenceHash,bytes32 memoId,uint64 createdAt,uint256 approvedBudget,uint256 payoutAmount,uint8 status)",
  "function usdc() view returns (address)",
  "event ExpenseRequested(uint256 indexed expenseId,address indexed requester,address indexed vendor,bytes32 metadataHash,bytes32 memoId,uint256 approvedBudget)",
  "event ManagerDecision(uint256 indexed expenseId,address indexed manager,bool approved)",
  "event ExpenseEvidenceSubmitted(uint256 indexed expenseId,address indexed requester,bytes32 evidenceHash,uint256 payoutAmount)",
  "event ExpenseRejected(uint256 indexed expenseId,address indexed decidedBy)",
  "event ExpenseCancelled(uint256 indexed expenseId,address indexed requester)",
  "event ExpensePaid(uint256 indexed expenseId,address indexed finance,address indexed vendor,uint256 amount,bytes32 memoId)",
]);

export const arcMemoAbi = parseAbi([
  "function memo(address target,bytes data,bytes32 memoId,bytes memoData)",
  "event Memo(address indexed sender,address indexed target,bytes32 callDataHash,bytes32 indexed memoId,bytes memo,uint256 memoIndex)",
]);

export const arcMemoAddress =
  "0x5294E9927c3306DcBaDb03fe70b92e01cCede505" as Address;

const configuredAddress =
  process.env.NEXT_PUBLIC_CLEARDEAL_TREASURY_ADDRESS?.trim();

export const clearDealTreasuryAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress)
    ? configuredAddress
    : undefined;

export const clearDealTreasuryConfigured = Boolean(
  clearDealTreasuryAddress,
);
