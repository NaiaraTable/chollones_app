import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para *ngIf
import { RouterLink } from '@angular/router'; // Necesario para navegar al login
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
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  settingsOutline,
  logOutOutline,
  chevronForwardOutline,
  notificationsOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

// Importamos el servicio de la API (MySQL)
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  standalone: true,
  imports: [
    CommonModule, // 1. Añadido para gestionar el estado de usuario/invitado
    RouterLink,   // 2. Añadido para el botón de "Iniciar Sesión"
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonAvatar, IonButton,
    IonButtons, IonNote
  ],
})
export class Tab5Page implements OnInit {
  usuario: any = null;

  // Un solo constructor donde inyectamos el servicio
  constructor(private supabase: ApiService) {
    addIcons({
      personCircleOutline,
      settingsOutline,
      logOutOutline,
      chevronForwardOutline,
      notificationsOutline,
      shieldCheckmarkOutline
    });
  }

  ngOnInit() {
    // 3. Nos suscribimos al BehaviorSubject del servicio
    // Esto actualizará automáticamente la vista cuando el usuario se loguee o salga
    this.supabase.currentUser$.subscribe(user => {
      this.usuario = user;
      console.log('Estado del usuario en Tab5:', this.usuario);
    });
  }

  async logout() {
    await this.supabase.logout();
    // No hace falta redirigir manualmente si el Guard ya no bloquea las Tabs
  }
}