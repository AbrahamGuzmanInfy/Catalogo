import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthRegisterComponent } from './auth-register.component';

describe('AuthRegisterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthRegisterComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(AuthRegisterComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AuthRegisterComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
