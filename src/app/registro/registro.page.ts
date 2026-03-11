import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonItem, IonLabel, IonInput, IonButton,
  IonButtons, IonBackButton, IonHeader, IonToolbar, IonTitle
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent,
    IonItem, IonLabel, IonInput, IonButton,
    IonButtons, IonBackButton, IonHeader, IonToolbar, IonTitle
  ]
})
export class RegistroPage {
  email = '';
  password = '';
  nombre = '';

  constructor(
    private supabase: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) { }

  async registrarse() {
    if (!this.email || !this.password || !this.nombre) {
      this.mostrarAlerta('Campos vacíos', 'Por favor, rellena todos los datos.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando cuenta...' });
    await loading.present();

    try {
      const res = await this.supabase.registro(this.email, this.password, this.nombre);
      await loading.dismiss();

      if (res && res.error) {
        this.mostrarAlerta('Error', res.error.message);
      } else {
        this.mostrarAlerta('¡Éxito!', 'Cuenta creada. Ahora puedes loguearte.');
        this.router.navigateByUrl('/tabs/login');
      }
    } catch (err) {
      await loading.dismiss();
      this.mostrarAlerta('Error', 'No se pudo conectar con el servidor.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await alert.present();
  }
}