# ClearDeal Arc Testnet proof

ClearDeal completed a public end-to-end milestone payment on Arc Testnet on
July 26, 2026.

## Result

- Deal ID: `0`
- Buyer: `0x27Bd802E4A53c345044cC8858fD78E324767A810`
- Seller: `0x44C8B6BFd6B37610a0873eB66D31272eB738D910`
- Project amount: `0.02` testnet USDC
- Final deal state: `Completed`
- Final milestone state: `Released`
- Released amount recorded by the contract: `0.02` testnet USDC
- Metadata hash:
  `0x18f77d8455ede8b9a49ebacb4e7ec54c6cf2488b96d445b99556a010eed1d1c9`
- Delivery hash:
  `0xe60abdb0dc5a92ed99c67432202e8913816edba14124e453f908062bd3040bdd`

Arc uses USDC for both the payment and network fees. The seller therefore
received the full `0.02` USDC milestone from the escrow while paying the
submission transaction fee from its USDC-denominated Arc balance.

## Public transactions

- [Create project](https://testnet.arcscan.app/tx/0x10ab96f60ec36277083cd5299e8b0d825eb2c7a0d430274e5cf8cdbd70310307)
- [Approve 0.02 USDC](https://testnet.arcscan.app/tx/0xd34c66a09419d7a4ef5e70fcce07f6a0171fdcf5f0356f0f89b03441ff55ba9e)
- [Fund escrow](https://testnet.arcscan.app/tx/0x97172aeb843c5a954cba3fbdcd5212aba1d51c60a7d87713df093daf28356a86)
- [Submit milestone evidence hash](https://testnet.arcscan.app/tx/0xb907a20df01f768166bdd0c1c23853be7db7f93c66dbd016d35c1f89c65f1d84)
- [Approve and release milestone](https://testnet.arcscan.app/tx/0xa2f6ae2f6930fe99b063ed17107401d011886ec1bfd87da9fd65b618871daa7f)
- [Verified ClearDealEscrow contract](https://testnet.arcscan.app/address/0x3488b4612a5ea84d56a5b41ac53ab7616213444a)

## Reproduce

The automated proof script is dry-run by default. The execution flag spends
testnet USDC and creates permanent public transactions.

```powershell
$env:CLEARDEAL_E2E_APP_URL="https://cleardeal-app.vercel.app"
$env:CLEARDEAL_E2E_EXECUTE="true"
npm run e2e:cleardeal:testnet
```

