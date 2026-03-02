import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonLabel, IonInput, IonButton
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router'; // Añadido RouterLink
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink, // Necesario para usar [routerLink] en el HTML
    IonContent, IonItem, IonLabel, IonInput, IonButton
  ]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';

  constructor(
    private supabase: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() { }

  // Función principal de Login unificada y blindada
  async handleLogin() {
    if (!this.email || !this.password) {
      this.showAlert('Atención', 'Por favor, introduce tu email y contraseña.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Iniciando sesión...' });
    await loading.present();

    try {
      // Llamada segura sin desestructurar {} directamente para evitar errores de red
      const respuesta = await this.supabase.login(this.email, this.password);

      await loading.dismiss();

      if (respuesta && respuesta.error) {
        this.showAlert('Error', 'Credenciales incorrectas o usuario no encontrado.');
      } else if (respuesta && respuesta.data) {
        console.log('✅ Login exitoso');
        // Redirigimos a la página principal
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      }
    } catch (err) {
      await loading.dismiss();
      this.showAlert('Error crítico', 'Hubo un problema de conexión con el servidor.');
    }
  }

  // Alerta genérica para mensajes al usuario
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}