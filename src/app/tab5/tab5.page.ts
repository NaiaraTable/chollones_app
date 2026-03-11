import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonAvatar,
  IonButton,
  IonButtons,
  IonNote,
  IonToggle  // <-- Importamos IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  settingsOutline,
  logOutOutline,
  chevronForwardOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  gridOutline,
  moon,            // <-- Icono luna para modo oscuro
  sunnyOutline     // <-- Icono sol para modo claro
} from 'ionicons/icons';

import { ApiService } from '../services/api.service';

const DARK_MODE_KEY = 'chollones_dark_mode'; // Clave usada en localStorage

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonAvatar, IonButton,
    IonButtons, IonNote,
    IonToggle  // <-- Añadido al array de imports
  ],
})
export class Tab5Page implements OnInit {
  usuario: any = null;
  isDarkMode: boolean = false;

  constructor(private supabase: ApiService) {
    addIcons({
      personCircleOutline,
      settingsOutline,
      logOutOutline,
      chevronForwardOutline,
      notificationsOutline,
      shieldCheckmarkOutline,
      gridOutline,
      moon,
      sunnyOutline
    });
  }

  ngOnInit() {
    // Suscripción al usuario actual
    this.supabase.currentUser$.subscribe(user => {
      this.usuario = user;
      console.log('Estado del usuario en Tab5:', this.usuario);
    });

    // Leer la preferencia guardada en localStorage al arrancar
    this.loadDarkModePreference();
  }

  /**
   * Lee la preferencia de modo oscuro guardada y la aplica al documento.
   * Se llama al iniciar la página.
   */
  private loadDarkModePreference(): void {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    // Si existe una preferencia guardada, la usamos; si no, respetamos la del sistema operativo
    if (saved !== null) {
      this.isDarkMode = saved === 'true';
    } else {
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyDarkMode(this.isDarkMode);
  }

  /**
   * Se dispara cuando el usuario mueve el toggle.
   * Guarda la preferencia y aplica el cambio de tema.
   */
  toggleDarkMode(event: any): void {
    this.isDarkMode = event.detail.checked;
    this.applyDarkMode(this.isDarkMode);
    // Guardar en localStorage para que persista entre sesiones y pestañas
    localStorage.setItem(DARK_MODE_KEY, String(this.isDarkMode));
  }

  /**
   * Aplica o elimina la clase 'dark' en el elemento <html> de Ionic,
   * que es el mecanismo oficial de Ionic para el modo oscuro.
   */
  private applyDarkMode(enable: boolean): void {
    document.body.classList.toggle('dark', enable);
  }

  async logout() {
    await this.supabase.logout();
  }
}
