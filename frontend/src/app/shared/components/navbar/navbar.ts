import { ChangeDetectorRef, Component, HostListener, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private readonly mobileBreakpoint = 900;

  userName = '';
  userRole: 'ADMIN' | 'USER' | '' = '';
  menuOpen = false;

  ngOnInit(): void {

    this.authService.user$.subscribe((user) => {
      if (user) {
        this.userName = user.name || user.email;
        this.userRole = user.role;
      } else {
        this.userName = '';
        this.userRole = '';
      }

      this.cdr.detectChanges();
    });

    this.authService.getMe().subscribe({
      next: (response) => {
        this.authService.setUser(response.user);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth > this.mobileBreakpoint && this.menuOpen){
      this.menuOpen = false;
      this.cdr.detectChanges();
    }
  }

}