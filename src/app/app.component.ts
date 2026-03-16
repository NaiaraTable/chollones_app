import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PushNotifications } from '@capacitor/push-notifications';

const DARK_MODE_KEY = 'chollones_dark_mode';

function initDarkMode(): void {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  let isDark: boolean;

  if (saved !== null) {
    isDark = saved === 'true';
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.body.classList.toggle('dark', isDark);
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, HttpClientModule],
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {
    initDarkMode();
  }

  ngOnInit() {
    this.iniciarNotificaciones();
  }

  iniciarNotificaciones() {
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });


    PushNotifications.addListener('registration', (token) => {
      console.log('Token FCM obtenido:', token.value);
      this.guardarTokenEnPhp(token.value);
    });


    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notificación recibida:', notification);
    });
  }


  guardarTokenEnPhp(fcmToken: string) {
    const usuarioId = localStorage.getItem('user_id');
    const url = 'https://chollones.com/guardar_token.php';

    if (usuarioId) {
      this.http.post(url, {
        user_id: usuarioId,
        fcm_token: fcmToken
      }).subscribe({
        next: (res) => console.log('Token guardado correctamente'),
        error: (err) => console.error('Error al guardar token', err)
      });
    }
  }
}
