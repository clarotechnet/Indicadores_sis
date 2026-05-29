import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import type { KmTecnica } from '@/types/database';

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY2NjM4NDY2ZDg2NTRiYTc4MTIwNDIxNTU1ODA3OTA2IiwiaCI6Im11cm11cjY0In0=';

interface KmMapTabProps {
  data: KmTecnica[];
  selectedTecnicos: string[];
}

interface RouteSegment {
  tecnico: string;
  trecho: string;
  km: number;
  from: { lat: number; lng: number; endereco: string };
  to: { lat: number; lng: number; endereco: string };
  geometry: [number, number][];
}

const ROUTE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

const KmMapTab: React.FC<KmMapTabProps> = ({ data, selectedTecnicos }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  // Get route geometry between two coordinate pairs
  const getRoute = useCallback(async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): Promise<[number, number][]> => {
    try {
      const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
        }),
      });
      const json = await res.json();
      if (json.features && json.features.length > 0) {
        return json.features[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
      }
    } catch (e) {
      // Silently fall back to straight line
    }
    return [[from.lat, from.lng], [to.lat, to.lng]];
  }, []);
  const shouldTraceRoutes = selectedTecnicos.length > 0;

  useEffect(() => {
    if (!shouldTraceRoutes) {
      setRouteSegments([]);
      return;
    }
    // Filter rows that have valid coordinates
    const rowsWithCoords = data.filter(
      r => r.coord_origem_x != null && r.coord_origem_y != null &&
           r.coord_destino_x != null && r.coord_destino_y != null
    );

    if (rowsWithCoords.length === 0) {
      setRouteSegments([]);
      return;
    }

    const process = async () => {
      setLoading(true);
      setStatusMsg('Traçando rotas...');

      const segments: RouteSegment[] = [];
      let count = 0;

      for (const row of rowsWithCoords) {
        const fromLat = row.coord_origem_y!;
        const fromLng = row.coord_origem_x!;
        const toLat = row.coord_destino_y!;
        const toLng = row.coord_destino_x!;

        // Skip if same point
        if (fromLat === toLat && fromLng === toLng) continue;

        const geometry = await getRoute(
          { lat: fromLat, lng: fromLng },
          { lat: toLat, lng: toLng }
        );

         segments.push({
          tecnico: row.recurso,
          trecho: row.trecho,
          km: row.distancia_km,
          from: { lat: fromLat, lng: fromLng, endereco: row.endereco_destino || row.trecho },
          to: { lat: toLat, lng: toLng, endereco: row.endereco_destino || row.trecho },
          geometry,
        });

        count++;
        setStatusMsg(`Traçando rotas... ${count}/${rowsWithCoords.length}`);
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 250));
      }

      setRouteSegments(segments);
      setStatusMsg('');
      setLoading(false);
    };

    process();
  }, [data, getRoute, shouldTraceRoutes]);

  // Initialize and update map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current).setView([-5.8, -35.2], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear old layers
      layersRef.current.forEach(l => map.removeLayer(l));
      layersRef.current = [];

      const allLatLngs: [number, number][] = [];

      // Assign colors per technician
      const techColors = new Map<string, string>();
      let colorIdx = 0;

      // Group segments by technician to determine first/last
      const techSegments = new Map<string, RouteSegment[]>();
      routeSegments.forEach(seg => {
        if (!techSegments.has(seg.tecnico)) techSegments.set(seg.tecnico, []);
        techSegments.get(seg.tecnico)!.push(seg);
      });

      techSegments.forEach((segments, tecnico) => {
        if (!techColors.has(tecnico)) {
          techColors.set(tecnico, ROUTE_COLORS[colorIdx % ROUTE_COLORS.length]);
          colorIdx++;
        }
        const color = techColors.get(tecnico) || '#3b82f6';

        segments.forEach((seg, segIdx) => {
          const polyline = L.polyline(seg.geometry, {
            color,
            weight: 4,
            opacity: 0.8,
          }).addTo(map);

          polyline.bindPopup(
            `<strong>${seg.tecnico}</strong><br/>` +
            `${seg.trecho}<br/>` +
            `<strong>${seg.km} km</strong>`
          );

          layersRef.current.push(polyline);
          seg.geometry.forEach(p => allLatLngs.push(p));

          // Determine marker colors based on position in sequence
          // First origin = green (Casa), last destination = red (Casa/retorno)
          // Intermediate = orange
          const isFirstOrigin = segIdx === 0;
          const isLastDest = segIdx === segments.length - 1;

          // Origin marker
          const fromFill = isFirstOrigin ? '#22c55e' : '#f59e0b';
          const fromBorder = isFirstOrigin ? '#166534' : '#92400e';
          const fromLabel = isFirstOrigin ? '🟢 Início (Casa)' : `🟠 Parada ${segIdx}`;
          const markerFrom = L.circleMarker([seg.from.lat, seg.from.lng], {
            radius: isFirstOrigin ? 8 : 5,
            fillColor: fromFill,
            color: fromBorder,
            weight: 2,
            fillOpacity: 0.95,
          }).addTo(map);
          markerFrom.bindPopup(`<strong>${seg.tecnico}</strong><br/>${fromLabel}: ${seg.from.endereco}`);
          layersRef.current.push(markerFrom);

          // Destination marker
          const toFill = isLastDest ? '#ef4444' : '#f59e0b';
          const toBorder = isLastDest ? '#911111' : '#92400e';
          const toLabel = isLastDest ? '🔴 Fim (Retorno)' : `🟠 Parada ${segIdx + 1}`;
          const markerTo = L.circleMarker([seg.to.lat, seg.to.lng], {
            radius: isLastDest ? 8 : 5,
            fillColor: toFill,
            color: toBorder,
            weight: 2,
            fillOpacity: 0.95,
          }).addTo(map);
          markerTo.bindPopup(`<strong>${seg.tecnico}</strong><br/>${toLabel}: ${seg.to.endereco}`);
          layersRef.current.push(markerTo);
        });
      });

      // Also show points for rows with coords but no route (fallback)
      const rowsWithCoords = data.filter(
        r => r.coord_destino_x != null && r.coord_destino_y != null
      );
      const markerSet = new Set<string>();
      rowsWithCoords.forEach(r => {
        const key = `${r.coord_destino_y},${r.coord_destino_x}`;
        if (markerSet.has(key)) return;
        markerSet.add(key);
        allLatLngs.push([r.coord_destino_y!, r.coord_destino_x!]);
      });

      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routeSegments, data]);

  const totalPoints = data.filter(r => r.coord_destino_x != null).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa de Rotas
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <span className="text-xs text-muted-foreground ml-auto">
            {loading ? statusMsg : !shouldTraceRoutes ? 'Selecione um técnico para traçar rotas' : `${totalPoints} pontos · ${routeSegments.length} rotas`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapRef} className="w-full h-[400px] sm:h-[500px] rounded-lg border border-border z-0" />
        {routeSegments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set(routeSegments.map(s => s.tecnico))].map((tech, i) => (
              <div key={tech} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
                />
                {tech}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KmMapTab;