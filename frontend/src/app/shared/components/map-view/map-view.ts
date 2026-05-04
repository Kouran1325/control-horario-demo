import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

@Component({
  selector: 'app-map-view',
  standalone: true,
  templateUrl: './map-view.html',
  styleUrl: './map-view.css'
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() points: { lat: number; lng: number; label?: string }[] = [];

  @ViewChild('mapContainer', { static: false })
  mapContainerRef!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private circle: L.Circle | null = null;
  private pointsLayer: L.LayerGroup | null = null;
  private invalidateTimeout: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if ((changes['lat'] || changes['lng']) && this.lat !== null && this.lng !== null) {
      this.updateMarker();
    }

    if (changes['points']) {
      this.renderPoints();
    }

    this.scheduleInvalidateSize();
  }

  ngOnDestroy(): void {
    if (this.invalidateTimeout) {
      clearTimeout(this.invalidateTimeout);
      this.invalidateTimeout = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainerRef || this.map) {
      return;
    }

    this.map = L.map(this.mapContainerRef.nativeElement).setView([28.1235, -15.4363], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.lat !== null && this.lng !== null) {
      this.updateMarker();
    }

    if (this.points.length > 0) {
      this.renderPoints();
    }

    this.scheduleInvalidateSize();
  }

  private updateMarker(): void {
    if (!this.map || this.lat === null || this.lng === null) {
      return;
    }

    const coords: L.LatLngExpression = [this.lat, this.lng];

    if (!this.marker) {
      this.marker = L.marker(coords, { icon: defaultIcon })
        .addTo(this.map)
        .bindPopup('Ubicación actual');
    } else {
      this.marker.setLatLng(coords);
    }

    if (!this.circle) {
      this.circle = L.circle(coords, {
        radius: 30,
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.2
      }).addTo(this.map);
    } else {
      this.circle.setLatLng(coords);
    }

    this.map.setView(coords, 16);
    this.scheduleInvalidateSize();
  }

  private renderPoints(): void {
    if (!this.map) {
      return;
    }

    if (this.pointsLayer) {
      this.pointsLayer.clearLayers();
    } else {
      this.pointsLayer = L.layerGroup().addTo(this.map);
    }

    const bounds: L.LatLngTuple[] = [];

    this.points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: this.getMarkerIcon(p.label)
      });

      if (p.label) {
        marker.bindPopup(p.label);
      }

      this.pointsLayer!.addLayer(marker);
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 16);
    } else if (bounds.length > 1) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }

    this.scheduleInvalidateSize();
  }

  private scheduleInvalidateSize(): void {
    if (!this.map) return;

    if (this.invalidateTimeout) {
      clearTimeout(this.invalidateTimeout);
    }

    this.invalidateTimeout = setTimeout(() => {
      this.map?.invalidateSize();
    }, 120);
  }

  private getMarkerIcon(label?: string): L.Icon {
    if (!label) {
      return defaultIcon;
    }

    if (label.startsWith('Inicio')) {
      return greenIcon;
    }

    if (label.startsWith('Fin')) {
      return redIcon;
    }

    return defaultIcon;
  }
}