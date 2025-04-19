import { Address, Site, ParsedSite, Building, ParsedBuilding } from '../types';

/**
 * Parse a JSON string address into an Address object
 */
export function parseAddress(addressString: string): Address {
  try {
    return JSON.parse(addressString) as Address;
  } catch (e) {
    console.error('Error parsing address:', e);
    throw new Error('Invalid address format');
  }
}

/**
 * Transform Site objects with string addresses to ParsedSite objects with Address objects
 */
export function parseSites(sites: Site[]): ParsedSite[] {
  return sites.map(site => {
    if (typeof site.address === 'string') {
      return {
        ...site,
        address: parseAddress(site.address)
      };
    }
    return site as ParsedSite;
  });
}

/**
 * Transform Building objects with string addresses to ParsedBuilding objects with Address objects
 */
export function parseBuildings(buildings: Building[]): ParsedBuilding[] {
  return buildings.map(building => {
    if (typeof building.address === 'string') {
      return {
        ...building,
        address: parseAddress(building.address)
      };
    }
    return building as ParsedBuilding;
  });
}

/**
 * Format an address for display
 */
export function formatAddress(address: Address): string {
  let formattedAddress = address.street1;
  
  if (address.street2) {
    formattedAddress += `, ${address.street2}`;
  }
  
  formattedAddress += `, ${address.city}, ${address.state} ${address.zip}`;
  
  return formattedAddress;
}
