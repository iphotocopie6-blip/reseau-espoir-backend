<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\Otp;
use App\Models\Referral;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller {
  public function register(Request $request) {
    $request->validate([
      'nom'=>'required','prenom'=>'required',
      'phone'=>'required|unique:users,phone',
      'commune'=>'required',
      'password'=>'required|min:6',
    ]);
    if ($request->device_id) {
      $countDevice = User::where('device_id',$request->device_id)->count();
      if ($countDevice >= 3) return response()->json(['message'=>'Limite 3 comptes par appareil'], 403);
    }
    $codePerso = User::generateCodePerso();
    $user = User::create([
      'nom'=>$request->nom,'prenom'=>$request->prenom,
      'phone'=>$request->phone,'email'=>$request->email,
      'commune'=>$request->commune,
      'password'=>Hash::make($request->password),
      'code_perso'=>$codePerso,
      'code_parrain'=>$request->code_parrain,
      'device_id'=>$request->device_id,
      'points'=>0,
    ]);
    $otpCode = rand(100000,999999);
    Otp::create(['phone'=>$user->phone,'code'=>$otpCode,'expires_at'=>now()->addMinutes(5)]);
    if ($request->code_parrain) {
      $parrain = User::where('code_perso',$request->code_parrain)->first();
      if ($parrain) { Referral::create(['parrain_id'=>$parrain->id,'filleul_id'=>$user->id,'status'=>'pending']); }
    }
    return response()->json(['message'=>'OTP envoye','user_id'=>$user->id,'otp_debug'=>$otpCode], 201);
  }

  public function verifyOtp(Request $request) {
    $request->validate(['phone'=>'required','code'=>'required']);
    $otp = Otp::where('phone',$request->phone)->where('code',$request->code)->where('expires_at','>',now())->latest()->first();
    if (!$otp) return response()->json(['message'=>'OTP invalide'], 400);
    $user = User::where('phone',$request->phone)->first();
    $user->otp_verified_at = now();
    $user->points = 5000;
    $user->save();
    Transaction::create(['user_id'=>$user->id,'type'=>'welcome','points'=>5000,'amount'=>0,'description'=>'Bonus bienvenue']);
    $otp->delete();
    $token = $user->createToken('mobile')->plainTextToken;
    return response()->json(['token'=>$token,'user'=>$user]);
  }

  public function activate(Request $request) {
    $user = $request->user();
    if ($user->is_active) return response()->json(['message'=>'Deja actif']);
    $user->is_active = true;
    $user->solde += 2000;
    $user->save();
    $referral = Referral::where('filleul_id',$user->id)->first();
    if ($referral) {
      $referral->status = 'active'; $referral->save();
      $parrain = User::find($referral->parrain_id);
      $parrain->points += 1000; $parrain->solde += 1000;
      $parrain->filleuls_count++; $parrain->save(); $parrain->updateNiveau();
      Transaction::create(['user_id'=>$parrain->id,'type'=>'referral','points'=>1000,'amount'=>1000,'description'=>"Parrainage {$user->prenom}"]);
    }
    return response()->json(['message'=>'Active +2000 FCFA']);
  }
}
