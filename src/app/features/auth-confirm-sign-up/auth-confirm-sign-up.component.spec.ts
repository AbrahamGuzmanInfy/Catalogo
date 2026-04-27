import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthConfirmSignUpComponent } from './auth-confirm-sign-up.component';

describe('AuthConfirmSignUpComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthConfirmSignUpComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(AuthConfirmSignUpComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthConfirmSignUpComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
