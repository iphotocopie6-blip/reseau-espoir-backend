<?php
namespace App\Http\Controllers;
use App\Models\Withdrawal;
use App\Models\Transaction;
use Illuminate\Http\Request;

class WalletController extends Controller {
  public function history(Request $request) {
    return Transaction::where('user_id',$request->user()->id)->latest()->get();
  }
  public function withdraw(Request $request) {
    $request->validate(['montant'=>'required|integer|min:10000','operateur'=>'required','numero'=>'required']);
    $user = $request->user();
    if ($user->solde < $request->montant) return response()->json(['message'=>'Solde insuffisant'], 400);
    if (Withdrawal::where('user_id',$user->id)->where('status','pending')->exists()) {
      return response()->json(['message'=>'Retrait deja en cours'], 400);
    }
    $user->solde -= $request->montant; $user->save();
    $w = Withdrawal::create(['user_id'=>$user->id,'montant'=>$request->montant,'operateur'=>$request->operateur,'numero'=>$request->numero,'status'=>'pending']);
    Transaction::create(['user_id'=>$user->id,'type'=>'withdrawal','amount'=>-$request->montant,'description'=>"Retrait {$request->operateur}",'status'=>'pending']);
    return response()->json(['message'=>'Retrait en validation 24-72h','withdrawal'=>$w]);
  }
}
