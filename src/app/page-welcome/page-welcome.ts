import { Component } from '@angular/core';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Details } from '../details/details';
import { ModelService } from '../model-service/model-service';
import { InfoTools } from '../info-tools/info-tools';

@Component({
  selector: 'app-page-welcome',
  imports: [Header,Footer,Details,InfoTools],
  templateUrl: './page-welcome.html',
  styleUrl: './page-welcome.css',
})
export class PageWelcome {}
