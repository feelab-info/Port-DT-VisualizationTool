import { Request, Response } from 'express';

// Predefined device list with friendly names for historical data queries
const PREDEFINED_DEVICES = [
  { device_id: "42cbb1f4188e92d557a2fbbee8b9b43e10303b753abcd2a", friendly_name: "D1" },
  { device_id: "920563467b8d08abe624ea2055b1ce20d9990aae24c8249", friendly_name: "D2" },
  { device_id: "1c8fc4175c2f338c9af1d1cef1263ac431dd40ccc190701", friendly_name: "D3" },
  { device_id: "a58570a95f7701a6947a13ea02ac6ab370648809cb476a1", friendly_name: "D4" },
  { device_id: "d8504b7b00fc88cb8e33d46c1bec29eaf6d9607be09f487", friendly_name: "D5" },
  { device_id: "ca85e7ef9fac2a1b1e93ae3e313e333ecaa88e0d9fd30b1", friendly_name: "D6" },
  { device_id: "c6300ce3e40562c24fea97d34d4bf81eeec78f684c15862", friendly_name: "D7" },
  { device_id: "764bd9eadd2b20d8dbb12add7935542bdef62ebd6ef52c1", friendly_name: "D8" },
  { device_id: "ba92b135f2699c9515b9d0978b5eccd847f0590629d2bc1", friendly_name: "D9" },
  { device_id: "15281110d02e83c0c5482a6cab631359314e0d8743d4d16", friendly_name: "D10" },
  { device_id: "37553b8b74596d404837f77e4bab026278d3c8b9c98efde", friendly_name: "D11" },
  { device_id: "ab999ce5e6c2c0584b67c98c8c069f1116eae3fce165ecb", friendly_name: "D12" },
  { device_id: "a12effa06dab6cda0b84b24558d9dff122a1e8ecbdd0f33", friendly_name: "D13" },
  { device_id: "e48fac30d192f5641545c4a17696de2f0064ac1152cf32a", friendly_name: "D14" },
  { device_id: "be741ad98c96fe3f4ebe51def5e5fab58d5308f76219835", friendly_name: "D15" },
  { device_id: "c45c6915cd0f954fa947c6ef43d5d02e2b22b8948d3aedc", friendly_name: "D16" },
  { device_id: "7606b7c2039430260e66bb5fd249f4a51f7381a0c37bf1b", friendly_name: "D17" },
  { device_id: "21892276db04aeb8978c135abd8db1f848906e2751e9ac4", friendly_name: "D18" },
  { device_id: "b8f3fd0839965ae505e87924a2b8d9a815e8030404c095a", friendly_name: "D19" },
  { device_id: "63521916b117b842b20a575abc11b79ac26b88bac8e0907", friendly_name: "D20" },
  { device_id: "5d9c00cd1876e84e552a3e4326f07a6bfd157d92a453f95", friendly_name: "D21" },
  { device_id: "4efd35a7620611921670b1efdbb3e1cb93897220fb815be", friendly_name: "D22" },
  { device_id: "6208525a49342facd5283db1b7d3268402864ebf14d93cc", friendly_name: "D23" },
  { device_id: "87e4c8110ec00fafd4b3e092247a61881a059bc7d7bce31", friendly_name: "D24" },
  { device_id: "e72f2c4131a561e60167fb463d0a379bde2cf57dc555b06", friendly_name: "D25" },
  { device_id: "cb79a0704a15d2bf6ac3fe503cc719922538c0104286e1a", friendly_name: "D26" },
  { device_id: "a1001c40c6beb6a872cca6c33a1e9505d1100bead7141fd", friendly_name: "D27" },
  { device_id: "ba90d98536a3816da5023c7f82ac6fdcf6ae3b0d9125fbd", friendly_name: "D28" },
  { device_id: "5d9438f135b3af4dcec01247dda71174e2cb221f252e4a7", friendly_name: "D29" },
  { device_id: "a541efa088b8b03542e36b121735df68fc7e92bc1cf1b19", friendly_name: "D30" },
  { device_id: "db91344fce2f7d9fa00490bb150c5e54d5486f776472033", friendly_name: "D31" },
  // Additional devices as requested
  { device_id: "f9_device_placeholder_id", friendly_name: "F9" },
  { device_id: "entrada_energia_placeholder_id", friendly_name: "Entrada de Energia" }
];

/**
 * Get all available devices for historical data queries
 * This returns all predefined devices regardless of whether they currently have data
 */
export async function getAllDevices(req: Request, res: Response): Promise<void> {
  try {
    // Return the predefined device list with proper structure for frontend
    const devices = PREDEFINED_DEVICES.map(device => ({
      id: device.device_id,
      name: device.friendly_name
    }));

    res.json({
      success: true,
      devices: devices,
      count: devices.length
    });
  } catch (error) {
    console.error('Error fetching device list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get device by ID with friendly name
 */
export async function getDeviceById(req: Request, res: Response): Promise<void> {
  try {
    const { deviceId } = req.params;
    
    const device = PREDEFINED_DEVICES.find(d => d.device_id === deviceId);
    
    if (!device) {
      res.status(404).json({
        success: false,
        error: 'Device not found'
      });
      return;
    }

    res.json({
      success: true,
      device: {
        id: device.device_id,
        name: device.friendly_name
      }
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
