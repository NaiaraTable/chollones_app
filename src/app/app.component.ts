import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

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
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    initDarkMode();
  }
}
