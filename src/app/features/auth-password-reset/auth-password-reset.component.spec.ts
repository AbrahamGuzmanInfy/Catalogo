import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthPasswordResetComponent } from './auth-password-reset.component';

describe('AuthPasswordResetComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPasswordResetComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(AuthPasswordResetComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthPasswordResetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
