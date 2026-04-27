import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthLoginComponent } from './auth-login.component';

describe('AuthLoginComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLoginComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(AuthLoginComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthLoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
