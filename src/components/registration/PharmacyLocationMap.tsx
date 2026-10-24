import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef } from 'react';

interface PharmacyLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (latitude: number, longitude: number) => void;
  onTileError: () => void;
}

export function PharmacyLocationMap({ latitude, longitude, onPositionChange, onTileError }: PharmacyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const initialPositionRef = useRef({ latitude, longitude });
  const callbackRef = useRef(onPositionChange);
  const tileErrorRef = useRef(onTileError);

  useEffect(() => { callbackRef.current = onPositionChange; }, [onPositionChange]);
  useEffect(() => { tileErrorRef.current = onTileError; }, [onTileError]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    void import('leaflet').then((module) => {
      if (cancelled || !containerRef.current) return;
      const L = module.default;
      const initialPosition = initialPositionRef.current;
      const hasPosition = initialPosition.latitude !== null && initialPosition.longitude !== null;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })
        .setView(hasPosition ? [initialPosition.latitude!, initialPosition.longitude!] : [12.8797, 121.774], hasPosition ? 17 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).on('tileerror', () => tileErrorRef.current()).addTo(map);
      map.on('click', (event) => callbackRef.current(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || latitude === null || longitude === null) return;
    let cancelled = false;
    void import('leaflet').then((module) => {
      if (cancelled || !mapRef.current) return;
      const L = module.default;
      const position: [number, number] = [latitude, longitude];
      if (!markerRef.current) {
        const icon = L.divIcon({ className: 'pharmacy-map-pin', html: '<span aria-hidden="true">+</span>', iconSize: [38, 44], iconAnchor: [19, 42] });
        const marker = L.marker(position, { draggable: true, icon, title: 'Confirmed pharmacy location' }).addTo(mapRef.current);
        marker.on('dragend', () => {
          const next = marker.getLatLng();
          callbackRef.current(next.lat, next.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(position);
      }
      mapRef.current.setView(position, Math.max(mapRef.current.getZoom(), 16), { animate: true });
    });
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return <div ref={containerRef} className="pharmacy-location-map" aria-label="Interactive pharmacy location map. Click the map or drag the pin to adjust the location." />;
}
