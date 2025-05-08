'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReturnToDashboard from '../components/ui/ReturnToDashboard';
// Use Nile API base URL specifically for this component
const NILE_API_BASE_URL = "https://u1.nile-global.cloud/api/v1";
// Removed getJwtToken import as it's not directly used in this restored version's logic
// If other parts of your auth flow depend on it for API calls, ensure it's handled appropriately elsewhere.

// Define segment color palette
const SEGMENT_COLOR_PALETTE = [
  "#E1E1E1",
  "#FF1580",
  "#265EFF",
  "#34FFF1",
  "#a5a497"
];

export default function PortViewer() {
  const { isAuthenticated, apiKeys } = useAuth();
  const [segments, setSegments] = useState<any[]>([]); // Consider defining a proper type for segments
  const [status, setStatus] = useState('Loading...');
  const [segmentIdToName, setSegmentIdToName] = useState<Record<string, string>>({});
  const previouslyColoredPorts = useRef(new Set<string>());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const initApp = async () => {
      let nileApiKey = apiKeys.find(key => key.service === 'Nile' || key.service.toLowerCase().includes('nile'));
      if (!nileApiKey && apiKeys.length > 0) {
        nileApiKey = apiKeys[0];
      }
      
      if (!nileApiKey) {
        setStatus('❌ No API keys found. Please add a Nile API key in your profile.');
        return;
      }

      const token = nileApiKey.key;
      setStatus(`✅ Using API key: ${nileApiKey.name} (${nileApiKey.service})`);
      await startApp(token);
    };

    initApp();

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isAuthenticated, apiKeys]);

  const startApp = async (token: string) => {
    try {
      const fetchedSegments = await fetchSegmentsApi(token); // Renamed to avoid conflict
      const segmentNames = fetchedSegments.map((s: any) => s.instanceName);
      setSegments(segmentNames);

      const idToName: Record<string, string> = {};
      fetchedSegments.forEach((seg: any) => {
        idToName[seg.id] = seg.instanceName;
      });
      setSegmentIdToName(idToName);

      await updateLivePortStatus(token, segmentNames, idToName);
      
      // Polling interval was very long, adjust if needed or remove if not desired
      // pollingInterval.current = setInterval(() => {
      //   updateLivePortStatus(token, segmentNames, idToName);
      // }, 10000000); // 10,000 seconds is ~2.7 hours
    } catch (error) {
      console.error('Error starting app:', error);
      setStatus('❌ Error fetching initial data');
    }
  };

  const updateLivePortStatus = async (token: string, segmentNames: string[], idToName: Record<string, string>) => {
    try {
      setStatus(prev => `${prev.split(' - ')[0]} - Fetching port data...`);
      
      const [clients, onlineMacs] = await Promise.all([
        fetchClientConfigsApi(token), // Renamed
        fetchOnlineMacsApi(token)    // Renamed
      ]);
      
      setStatus(prev => 
        `${prev.split(' - ')[0]} - Found ${clients.length} clients, ${onlineMacs.size} online MACs`
      );

      for (let i = 1; i <= 48; i++) {
        setPortDivColor(`port${i}`, null, 'reset');
      }
      setPortDivColor('portSFP1', null, 'reset');
      setPortDivColor('portSFP2', null, 'reset');
      previouslyColoredPorts.current.clear();

      let coloredPortCount = 0;
      clients.forEach((entry: any) => {
        const config = entry.clientConfig;
        if (!config || !config.macAddress) return;

        const mac = config.macAddress.toLowerCase();
        if (!onlineMacs.has(mac)) return;

        const port = config.lastPort;
        const segId = config.segmentId;
        if (!port || !segId || segId === "Unknown") return;

        const segmentName = idToName[segId] || "Unknown";
        const segIndex = segmentNames.indexOf(segmentName);
        const color = getSegmentColor(segIndex);

        let portNumber;
        try {
          portNumber = parseInt(port.split("/")[1]);
        } catch (e) {
          console.error(`Error parsing port number from ${port}:`, e);
          return;
        }

        const portId = `port${portNumber}`;
        setPortDivColor(portId, color, 'live-update');
        previouslyColoredPorts.current.add(portId);
        coloredPortCount++;
      });
      
      setStatus(prev => 
        `${prev.split(' - ')[0]} - Colored ${coloredPortCount} ports`
      );
    } catch (error) {
      console.error('Error updating port status:', error);
      setStatus(prev => `${prev.split(' - ')[0]} - Error updating port status`);
    }
  };

  const getSegmentColor = (index: number) => {
    return SEGMENT_COLOR_PALETTE[index % SEGMENT_COLOR_PALETTE.length];
  };

  // Original function to color div elements
  const setPortDivColor = (portId: string, color: string | null, reason: string) => {
    const portElement = document.getElementById(portId);
    if (portElement) {
      try {
        portElement.style.setProperty('background-color', color || 'rgba(255, 255, 255, 0.3)', 'important');
        portElement.style.setProperty('opacity', color ? '1' : '1', 'important'); // Keep opacity 1 for default
        portElement.style.setProperty('border', color ? '2px solid white' : '2px solid white', 'important'); // Keep border for default
        console.log(`Port DIV ${portId} ${color ? 'colored' : 'reset'} (${reason})`);
      } catch (e) {
        console.error(`Error setting color for port DIV ${portId}:`, e);
      }
    } else {
      console.warn(`Port DIV element ${portId} not found in DOM`);
    }
  };

  // Renamed API functions to avoid conflict if they were defined elsewhere
  const fetchSegmentsApi = async (token: string) => {
    const url = `${NILE_API_BASE_URL}/settings/segments`;
    try {
      const res = await fetch(url, { headers: { 'x-nile-api-key': token.trim() } });
      if (!res.ok) throw new Error(`Segment API error: ${res.status}`);
      const result = await res.json();
      return result?.data?.content || [];
    } catch (err) {
      console.error("Failed to fetch segments:", err);
      throw err; // Re-throw to be caught by startApp
    }
  };

  const fetchClientConfigsApi = async (token: string) => {
    const url = `${NILE_API_BASE_URL}/client-configs-list`;
    try {
      const res = await fetch(url, { headers: { 'x-nile-api-key': token.trim() } });
      if (!res.ok) throw new Error(`Client Configs API error: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch client configs:", err);
      throw err; // Re-throw
    }
  };

  const fetchOnlineMacsApi = async (token: string) => {
    const endTime = new Date().toISOString().split('.')[0] + 'Z';
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('.')[0] + 'Z';
    const url = `https://u1.nile-global.cloud/api/v1/public/client-list-paginated-details?endTime=${encodeURIComponent(endTime)}&startTime=${encodeURIComponent(startTime)}&pageNumber=0&pageSize=99999`;
    try {
      const res = await fetch(url, { headers: { 'x-nile-api-key': token.trim() } });
      if (!res.ok) throw new Error(`Online MACs API error: ${res.status}`);
      const data = await res.json();
      const onlineClients = (data.clientList || []).filter((c: any) => c.clientStatus === "ONLINE");
      return new Set(onlineClients.map((c: any) => c.macAddress.toLowerCase()));
    } catch (err) {
      console.error("Failed to fetch online MACs:", err);
      throw err; // Re-throw
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">Port Viewer</h1>
        <p className="text-xl mb-8">Please log in to access this feature.</p>
        <ReturnToDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Nile Port Viewer</h1>
        
        <div className="overflow-x-auto mb-32">
          <div className="relative min-w-[1400px] h-[150px] bg-[url('/Switch.png')] bg-no-repeat bg-contain border border-gray-700">
            {Array.from({ length: 48 }, (_, i) => i + 1).map(portNum => {
              const pairIndex = Math.floor((portNum - 1) / 2);
              const clusterIndex = Math.floor(pairIndex / 6);
              const positionInCluster = pairIndex % 6;
              let leftPosition;
              const portSpacing = 47;
              const startPosition = 45;
              if (clusterIndex === 0) {
                leftPosition = startPosition + (positionInCluster * portSpacing);
              } else if (clusterIndex === 1) {
                leftPosition = startPosition + (5 * portSpacing) + 60 + (positionInCluster * portSpacing);
              } else if (clusterIndex === 2) {
                leftPosition = startPosition + (5 * portSpacing) + 60 + (5 * portSpacing) + 68 + (positionInCluster * portSpacing);
              } else {
                leftPosition = startPosition + (5 * portSpacing) + 60 + (5 * portSpacing) + 68 + (5 * portSpacing) + 60 + (positionInCluster * portSpacing);
              }
              return (
                <div 
                  key={portNum}
                  id={`port${portNum}`}
                  className="absolute cursor-pointer"
                  style={{
                    width: '20px',
                    height: '20px',
                    top: portNum % 2 === 1 ? '45px' : '90px',
                    left: `${leftPosition}px`,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Default appearance
                    border: '2px solid white', // Default appearance
                    opacity: 1, // Default appearance
                    zIndex: 10
                  }}
                ></div>
              );
            })}
            <div id="portSFP1" className="absolute cursor-pointer" style={{ width: '20px', height: '20px', top: '45px', left: '1354px', backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '2px solid white', opacity: 1, zIndex: 10 }}></div>
            <div id="portSFP2" className="absolute cursor-pointer" style={{ width: '20px', height: '20px', top: '90px', left: '1354px', backgroundColor: 'rgba(255, 255, 255, 0.3)', border: '2px solid white', opacity: 1, zIndex: 10 }}></div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start bg-gray-800 border border-gray-700 rounded p-6">
          <div className="flex-1 mb-4 md:mb-0 md:mr-4">
            <h3 className="text-xl font-semibold mb-3 text-white">Color Legend</h3>
            <p className="text-gray-300 mb-4">Each color represents a different network segment. Ports are colored based on their assigned segment.</p>
            {segments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {segments.map((segment, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-700 rounded">
                    <div className="w-6 h-6 mr-3 rounded border border-gray-600" style={{ backgroundColor: getSegmentColor(index) }}></div>
                    <span className="font-medium">{segment}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No segments found</p>
            )}
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <h4 className="font-medium mb-2 text-gray-300">Port Coloring</h4>
              <p className="text-sm text-gray-400">Ports are colored based on real-time data from the Nile API. Only ports with active connections will be colored. The color indicates which network segment the device is connected to.</p>
              <p className="text-sm text-gray-400 mt-2">If no ports are colored, it means there are no active connections or the API key doesn't have access to the required data.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-blue-400">{status}</div>
            <button 
              onClick={() => {
                const token = apiKeys.find(key => key.service === 'Nile' || key.service.toLowerCase().includes('nile'))?.key || apiKeys[0]?.key;
                if (token) {
                  setStatus('🔄 Manually refreshing...');
                  updateLivePortStatus(token, segments, segmentIdToName);
                }
              }}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={!apiKeys.length}
            >
              Refresh Now
            </button>
            {status.includes('❌') && (
              <div className="mt-2 text-sm text-gray-400">
                <p>To add an API key:</p>
                <ol className="list-decimal list-inside mt-1">
                  <li>Go to your <a href="/profile" className="text-blue-400 hover:underline">Profile</a></li>
                  <li>Click "Add API Key"</li>
                  <li>Enter a name, your Nile API key, and "Nile" as the service</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <ReturnToDashboard />
        </div>
      </div>
    </div>
  );
}
