<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;
Route::post('/register', [AuthController::class,'register']);
Route::post('/verify-otp', [AuthController::class,'verifyOtp']);
Route::middleware('auth:sanctum')->group(function(){
  Route::post('/activate', [AuthController::class,'activate']);
  Route::get('/dashboard', function(\Illuminate\Http\Request $r){ return $r->user(); });
  Route::get('/transactions', [WalletController::class,'history']);
  Route::post('/withdraw', [WalletController::class,'withdraw']);
  Route::get('/leaderboard', function(){ return \App\Models\User::orderByDesc('filleuls_count')->limit(50)->get(); });
});
