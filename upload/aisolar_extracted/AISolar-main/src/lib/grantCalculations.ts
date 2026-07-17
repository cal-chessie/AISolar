// Irish Solar Grant Calculations (SEAI 2024)
// Domestic: €1,800 max for systems ≥2kWp
// Commercial: Based on system size and grant call

export type PropertyType = 'residential' | 'commercial_small' | 'commercial_large' | 'industrial';

export interface GrantCalculation {
  grantAmount: number;
  requiresReview: boolean;
  reviewReason?: string;
  grantType: string;
  notes: string;
}

export interface SystemCosts {
  systemCost: number;
  installationCost: number;
  totalCost: number;
  netCost: number;
  monthlyPayment?: number;
}

// Domestic Grant (SEAI 2024) - €1,800 max for systems ≥2kWp
export function calculateDomesticGrant(systemSizeKw: number): GrantCalculation {
  if (systemSizeKw < 2) {
    return {
      grantAmount: Math.round(systemSizeKw * 900),
      requiresReview: false,
      grantType: 'SEAI Domestic',
      notes: `€900 per kWp for systems under 2kWp. Consider upgrading to 2kWp for maximum grant.`
    };
  }
  
  return {
    grantAmount: 1800,
    requiresReview: false,
    grantType: 'SEAI Domestic',
    notes: `Maximum SEAI domestic grant of €1,800 for systems ≥2kWp.`
  };
}

// Commercial Grant (SEAI Non-Domestic)
export function calculateCommercialGrant(systemSizeKw: number, propertyType: PropertyType): GrantCalculation {
  // Small Commercial (<6kWp)
  if (systemSizeKw < 6) {
    const grantAmount = Math.min(2700, Math.round(systemSizeKw * 900));
    return {
      grantAmount,
      requiresReview: false,
      grantType: 'SEAI Commercial Small',
      notes: `Commercial grant: €900/kWp up to €2,700 for systems <6kWp.`
    };
  }
  
  // Medium Commercial (6-50kWp)
  if (systemSizeKw <= 50) {
    const baseGrant = 2700; // First 6kWp at €900/kWp = €5,400, capped at €2,700
    const additionalKw = systemSizeKw - 6;
    const additionalGrant = Math.round(additionalKw * 300); // €300/kWp for additional
    const grantAmount = Math.min(16200, baseGrant + additionalGrant);
    
    return {
      grantAmount,
      requiresReview: systemSizeKw > 20, // Review for larger systems
      reviewReason: systemSizeKw > 20 ? 'System >20kWp requires technical assessment' : undefined,
      grantType: 'SEAI Commercial Medium',
      notes: `Commercial grant for 6-50kWp systems. ${systemSizeKw > 20 ? 'Requires engineer review before final grant confirmation.' : ''}`
    };
  }
  
  // Large Commercial (>50kWp)
  return {
    grantAmount: 16200, // Estimate pending consultation
    requiresReview: true,
    reviewReason: 'Large commercial system requires full engineering assessment and grant application review',
    grantType: 'SEAI Commercial Large',
    notes: `Large systems >50kWp require custom grant application. €16,200 is an estimate pending SEAI approval.`
  };
}

// Industrial - Always requires consultation
export function calculateIndustrialGrant(systemSizeKw: number): GrantCalculation {
  return {
    grantAmount: 0,
    requiresReview: true,
    reviewReason: 'Industrial installations require custom proposal with engineering consultation',
    grantType: 'Custom Industrial',
    notes: `Industrial systems require dedicated engineering assessment. Grant availability varies by grant call cycle.`
  };
}

// Main grant calculator
export function calculateGrant(systemSizeKw: number, propertyType: PropertyType): GrantCalculation {
  if (!systemSizeKw || systemSizeKw <= 0) {
    return {
      grantAmount: 0,
      requiresReview: false,
      grantType: 'None',
      notes: 'System size required for grant calculation'
    };
  }

  switch (propertyType) {
    case 'residential':
      return calculateDomesticGrant(systemSizeKw);
    case 'commercial_small':
    case 'commercial_large':
      return calculateCommercialGrant(systemSizeKw, propertyType);
    case 'industrial':
      return calculateIndustrialGrant(systemSizeKw);
    default:
      return calculateDomesticGrant(systemSizeKw);
  }
}

// System cost calculator
export function calculateSystemCosts(
  systemSizeKw: number,
  propertyType: PropertyType,
  includesBattery: boolean = false,
  batteryCapacityKwh: number = 0
): SystemCosts {
  // Base cost per kW (varies by property type)
  const costPerKw = propertyType === 'residential' 
    ? 1400 
    : propertyType === 'industrial' 
      ? 1100 
      : 1250;

  const panelCost = systemSizeKw * costPerKw;
  
  // Battery cost (€500-700 per kWh)
  const batteryCost = includesBattery ? batteryCapacityKwh * 600 : 0;
  
  // Installation varies by property type
  const installationMultiplier = propertyType === 'residential' 
    ? 0.15 
    : propertyType === 'industrial' 
      ? 0.25 
      : 0.2;
  
  const installationCost = Math.round((panelCost + batteryCost) * installationMultiplier);
  const totalCost = panelCost + batteryCost + installationCost;
  
  // Get grant
  const grant = calculateGrant(systemSizeKw, propertyType);
  const netCost = totalCost - grant.grantAmount;

  return {
    systemCost: panelCost + batteryCost,
    installationCost,
    totalCost,
    netCost,
    monthlyPayment: Math.round(netCost / 120) // 10 year estimate
  };
}

// ROI Calculator
export function calculateROI(
  systemSizeKw: number,
  annualConsumptionKwh: number,
  electricityTariff: number = 0.35,
  propertyType: PropertyType = 'residential'
) {
  const estimatedAnnualProduction = systemSizeKw * 900; // kWh per kW in Ireland
  const selfConsumptionRate = propertyType === 'residential' ? 0.5 : 0.7;
  const exportRate = 0.21; // Microgeneration export rate
  
  const selfConsumedKwh = Math.min(estimatedAnnualProduction * selfConsumptionRate, annualConsumptionKwh);
  const exportedKwh = estimatedAnnualProduction - selfConsumedKwh;
  
  const savingsFromSelfConsumption = selfConsumedKwh * electricityTariff;
  const exportIncome = exportedKwh * exportRate;
  const totalAnnualSavings = savingsFromSelfConsumption + exportIncome;
  
  const costs = calculateSystemCosts(systemSizeKw, propertyType);
  const paybackYears = costs.netCost / totalAnnualSavings;
  
  // 25 year lifetime ROI
  const totalSavings25Years = totalAnnualSavings * 25;
  const roi = ((totalSavings25Years - costs.netCost) / costs.netCost) * 100;
  
  // CO2 savings (0.3kg per kWh in Ireland)
  const annualCO2Savings = estimatedAnnualProduction * 0.3;
  const lifetimeCO2Savings = annualCO2Savings * 25;
  
  return {
    estimatedAnnualProduction,
    selfConsumedKwh,
    exportedKwh,
    annualSavings: Math.round(totalAnnualSavings),
    monthlySavings: Math.round(totalAnnualSavings / 12),
    paybackYears: Math.round(paybackYears * 10) / 10,
    roi: Math.round(roi),
    annualCO2Savings: Math.round(annualCO2Savings),
    lifetimeCO2Savings: Math.round(lifetimeCO2Savings / 1000), // tonnes
    energyOffset: Math.round((estimatedAnnualProduction / annualConsumptionKwh) * 100)
  };
}
