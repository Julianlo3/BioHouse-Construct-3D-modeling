import { Component } from '@angular/core';
import { Model3d } from '../../model/model3d/model3d';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [Model3d],
  templateUrl: './start.html',
  styleUrl: './start.css',
})
export class Start {}
