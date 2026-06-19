export interface CowNutritionProfile {
  liveWeightKg: number
  milkYieldLitresPerDay: number
  milkFatPercent: number
  milkProteinPercent: number
  lactationWeekNumber: number
  bodyConditionScore: number
  isPregnant: boolean
  pregnancyWeekNumber?: number
}

export interface DailyRequirements {
  meMjPerDay: number
  mpGPerDay: number
  ndfMinPercent: number
  dmIntakeKgPerDay: number
}

export interface FeedItem {
  local_id: string
  name: string
  category: string
  dry_matter_percent: number
  me_mj_per_kg_dm: number
  mp_g_per_kg_dm: number
  ndf_percent_dm: number
  cost_per_kg_kes: number
  quantity_kg_as_fed: number
}

export interface FeedAllocation {
  feed: FeedItem
  quantityKgDm: number
  meContribution: number
  mpContribution: number
  ndfKg: number
  costKes: number
}

export interface RationResult {
  allocations: FeedAllocation[]
  totalMeMj: number
  totalMpG: number
  totalNdfPercent: number
  totalDmKg: number
  totalCostKes: number
  costPerLitre: number
  meBalance: number
  mpBalance: number
  warnings: string[]
}

export function calculateRequirements(cow: CowNutritionProfile): DailyRequirements {
  const w = cow.liveWeightKg || 450

  // Maintenance ME (MJ/day) - ARC/CSIRO model for dairy cattle
  const meMaintenance = 0.515 * Math.pow(w, 0.75) * 0.001 * 4.184

  // Milk ME: fat-protein corrected milk energy
  const fat = cow.milkFatPercent || 3.5
  const prot = cow.milkProteinPercent || 3.2
  const fcm = cow.milkYieldLitresPerDay * (0.337 + 0.116 * fat + 0.06 * prot)
  const meMilk = fcm * 5.17

  // Pregnancy supplement (last 8 weeks = after week 32)
  const mePreg = cow.isPregnant && (cow.pregnancyWeekNumber ?? 0) > 32
    ? 0.1 * ((cow.pregnancyWeekNumber! - 32) * 0.8)
    : 0

  // BCS adjustment - thin cows need more to mobilise body reserves
  const bcAdj = (cow.bodyConditionScore || 3.0) < 2.5 ? 1.05 : 1.0

  const totalME = (meMaintenance + meMilk + mePreg) * bcAdj

  // MP requirements (g/day)
  const mpMaint = 2.19 * Math.pow(w, 0.75) * 0.001
  const mpMilk = cow.milkYieldLitresPerDay * (1.47 * prot / 0.68)
  const totalMP = (mpMaint + mpMilk) * bcAdj

  // Expected DMI (kg/day)
  const dmi = 0.025 * w + 0.1 * cow.milkYieldLitresPerDay

  return {
    meMjPerDay: Math.round(totalME * 10) / 10,
    mpGPerDay: Math.round(totalMP),
    ndfMinPercent: 32,
    dmIntakeKgPerDay: Math.round(dmi * 10) / 10,
  }
}

export function formulateRation(
  requirements: DailyRequirements,
  feeds: FeedItem[],
): RationResult {
  const warnings: string[] = []
  const allocations: FeedAllocation[] = []
  let totalME = 0
  let totalMP = 0
  let totalNdf = 0
  let totalDm = 0
  let totalCost = 0

  for (const feed of feeds) {
    if (!feed.quantity_kg_as_fed || feed.quantity_kg_as_fed <= 0) continue
    const dm = feed.dry_matter_percent / 100
    const dmKg = feed.quantity_kg_as_fed * dm
    const me = dmKg * (feed.me_mj_per_kg_dm || 0)
    const mp = dmKg * (feed.mp_g_per_kg_dm || 0)
    const ndfKg = dmKg * ((feed.ndf_percent_dm || 0) / 100)
    const cost = feed.quantity_kg_as_fed * (feed.cost_per_kg_kes || 0)

    allocations.push({ feed, quantityKgDm: dmKg, meContribution: me, mpContribution: mp, ndfKg, costKes: cost })
    totalME += me
    totalMP += mp
    totalNdf += ndfKg
    totalDm += dmKg
    totalCost += cost
  }

  const meBalance = totalME - requirements.meMjPerDay
  const mpBalance = totalMP - requirements.mpGPerDay
  const ndfPercent = totalDm > 0 ? (totalNdf / totalDm) * 100 : 0

  if (meBalance < -5) warnings.push(`Energy deficit: ${Math.abs(meBalance).toFixed(1)} MJ/day short. Add more concentrate.`)
  if (meBalance > 10) warnings.push(`Energy surplus: ${meBalance.toFixed(1)} MJ/day excess. Consider reducing dairy meal.`)
  if (mpBalance < -50) warnings.push(`Protein deficit: ${Math.abs(mpBalance).toFixed(0)}g/day short. Add protein supplement.`)
  if (ndfPercent < 32 && totalDm > 0) warnings.push(`Fibre (NDF) too low (${ndfPercent.toFixed(0)}%). Increase forage to protect rumen health.`)
  if (totalDm > requirements.dmIntakeKgPerDay * 1.2) warnings.push(`Total DMI may exceed appetite capacity. Reduce total feed volumes.`)

  const yield_ = feeds.reduce((s, f) => s + (f.quantity_kg_as_fed || 0), 0)

  return {
    allocations,
    totalMeMj: Math.round(totalME * 10) / 10,
    totalMpG: Math.round(totalMP),
    totalNdfPercent: Math.round(ndfPercent),
    totalDmKg: Math.round(totalDm * 10) / 10,
    totalCostKes: Math.round(totalCost),
    costPerLitre: yield_ > 0 ? Math.round((totalCost / yield_) * 100) / 100 : 0,
    meBalance: Math.round(meBalance * 10) / 10,
    mpBalance: Math.round(mpBalance),
    warnings,
  }
}
