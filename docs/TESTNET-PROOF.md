# ClearDeal Arc Testnet proof

ClearDealEscrowV2 completed a public end-to-end milestone payment on Arc
Testnet on July 30, 2026.

## Result

- Deal ID: `0`
- Buyer: `0x27Bd802E4A53c345044cC8858fD78E324767A810`
- Seller: `0x381BD53Cf7bD1A206E641feD66D0C76B019A9845`
- Project amount: `0.02` testnet USDC
- Final deal state: `Completed`
- Final milestone state: `Released`
- Released amount recorded by the contract: `0.02` testnet USDC
- Metadata hash:
  `0xbc90bb720d7adda31b36c9a30a4267599e8232957493eccb0d0f94789029db2e`
- Delivery hash:
  `0x7e162d9ae4fe95836e755537e0c8a48d1d56bd5453c02e943116f1fda654dc2d`

Arc uses USDC for both the payment and network fees. The seller therefore
received the full `0.02` USDC milestone from the escrow while paying the
submission transaction fee from its USDC-denominated Arc balance.

## Public transactions

- [Create project](https://testnet.arcscan.app/tx/0x0e075e040e6d390002218bee0470304bcd081b8f9b4c509a76019ec5bcb4ea6a)
- [Approve 0.02 USDC](https://testnet.arcscan.app/tx/0x96a2c271bb192f48a599e05610b96e8d3e851d9e15f7650e25a475c5811e9a86)
- [Fund escrow](https://testnet.arcscan.app/tx/0xeb7c95ccc49a3f0150ca6ceb0fbb2bd2c227d833fbcee40bb6f46b7518d615bc)
- [Submit milestone evidence hash](https://testnet.arcscan.app/tx/0xb0e7e6bca8a9c2bc985caff9bec38685c26e52ab293bfe021c9874a26b6aba11)
- [Approve and release milestone](https://testnet.arcscan.app/tx/0x00cb1013195727c950eeffd102c2bbe7f329a4650dea882e7be42ba5e88b997f)
- [Verified ClearDealEscrowV2 contract](https://testnet.arcscan.app/address/0x9F95E8Cf6D495F6B1898526D8Bb301b3523560fe#code)

## Reproduce

The automated proof script is dry-run by default. The execution flag spends
testnet USDC and creates permanent public transactions.

```powershell
$env:CLEARDEAL_E2E_APP_URL="https://cleardeal-app.vercel.app"
$env:CLEARDEAL_E2E_EXECUTE="true"
npm run e2e:cleardeal:testnet
```
